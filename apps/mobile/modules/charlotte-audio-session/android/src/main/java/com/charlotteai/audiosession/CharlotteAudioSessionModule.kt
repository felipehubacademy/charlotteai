package com.charlotteai.audiosession

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * CharlotteAudioSession (Android) — substitui InCallManager.
 *
 * Android e mais simples que iOS:
 *   - AudioManager.setSpeakerphoneOn(true) eh sticky e nao briga com WebRTC.
 *   - Nao tem o problema de singleton AVAudioSession.
 *   - MODE_IN_COMMUNICATION habilita AEC hardware nos devices que suportam.
 *
 * Listener de ACTION_HEADSET_PLUG re-afirma speaker quando user desconecta
 * fones — Android nao re-afirma sozinho.
 */
class CharlotteAudioSessionModule : Module() {
  private var audioManager: AudioManager? = null
  private var previousMode: Int = AudioManager.MODE_NORMAL
  private var preferSpeaker: Boolean = true
  private var isActive: Boolean = false
  private var headsetReceiver: BroadcastReceiver? = null
  private var ringbackPlayer: MediaPlayer? = null

  override fun definition() = ModuleDefinition {
    Name("CharlotteAudioSession")

    Events("onRouteChange", "onInterruption")

    /**
     * Toca o ringback bundlado em res/raw/incallmanager_ringback (via config
     * plugin with-incallmanager-ringback.js). Como o resource fica no APK do
     * main app — nao no AAR do modulo — usamos getIdentifier dinamico.
     *
     * AudioAttributes USAGE_VOICE_COMMUNICATION mantem o audio na pipeline
     * de chamada, mesmo speaker que ja configuramos via MODE_IN_COMMUNICATION.
     */
    AsyncFunction("playRingback") { ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val resId = context.resources.getIdentifier("incallmanager_ringback", "raw", context.packageName)
      if (resId == 0) {
        android.util.Log.w("CharlotteAudioSession", "ringback resource not found in res/raw")
        return@AsyncFunction false
      }
      try {
        // Garante session configurada antes do ringback rolar.
        if (!isActive) {
          val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            ?: return@AsyncFunction false
          audioManager = am
          previousMode = am.mode
          am.mode = AudioManager.MODE_IN_COMMUNICATION
          am.isSpeakerphoneOn = preferSpeaker
          installHeadsetReceiver(context)
          isActive = true
        }
        // Recria player a cada play() — MediaPlayer e finicky com state machine,
        // mais simples reabrir que reusar.
        ringbackPlayer?.release()
        val mp = MediaPlayer.create(context, resId) ?: return@AsyncFunction false
        mp.setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        mp.isLooping = true
        mp.start()
        ringbackPlayer = mp
        true
      } catch (e: Throwable) {
        android.util.Log.w("CharlotteAudioSession", "playRingback error", e)
        false
      }
    }

    AsyncFunction("stopRingback") {
      try {
        ringbackPlayer?.stop()
        ringbackPlayer?.release()
      } catch (e: Throwable) {
        android.util.Log.w("CharlotteAudioSession", "stopRingback error", e)
      }
      ringbackPlayer = null
    }

    AsyncFunction("start") { preferSpeakerInput: Boolean ->
      this@CharlotteAudioSessionModule.preferSpeaker = preferSpeakerInput
      val context = appContext.reactContext ?: return@AsyncFunction false
      val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return@AsyncFunction false
      audioManager = am

      try {
        previousMode = am.mode
        am.mode = AudioManager.MODE_IN_COMMUNICATION
        am.isSpeakerphoneOn = preferSpeakerInput
        installHeadsetReceiver(context)
        isActive = true
        true
      } catch (e: Throwable) {
        android.util.Log.w("CharlotteAudioSession", "start error", e)
        false
      }
    }

    AsyncFunction("stop") {
      try {
        ringbackPlayer?.stop()
        ringbackPlayer?.release()
      } catch (e: Throwable) { /* ignore */ }
      ringbackPlayer = null
      removeHeadsetReceiver()
      audioManager?.let { am ->
        try {
          am.isSpeakerphoneOn = false
          am.mode = previousMode
        } catch (e: Throwable) {
          android.util.Log.w("CharlotteAudioSession", "stop error", e)
        }
      }
      audioManager = null
      isActive = false
    }

    AsyncFunction("setSpeakerOn") { on: Boolean ->
      preferSpeaker = on
      audioManager?.let { am ->
        try {
          am.isSpeakerphoneOn = on
          true
        } catch (e: Throwable) {
          android.util.Log.w("CharlotteAudioSession", "setSpeakerOn error", e)
          false
        }
      } ?: false
    }

    Function("getCurrentRoute") {
      val am = audioManager ?: return@Function "uninitialized"
      val outputs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).joinToString(",") { d ->
          "${typeName(d.type)}:${d.productName}"
        }
      } else {
        "unknown"
      }
      outputs
    }
  }

  private fun installHeadsetReceiver(context: Context) {
    if (headsetReceiver != null) return
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_HEADSET_PLUG)
      addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
    }
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        val action = intent?.action ?: return
        val state = intent.getIntExtra("state", -1) // 0 = unplugged, 1 = plugged (HEADSET_PLUG)

        android.util.Log.i("CharlotteAudioSession", "route change action=$action state=$state")

        // Quando user desconecta fones, Android nao re-afirma speaker sozinho —
        // audio iria pra earpiece. Reaplicamos se preferimos speaker.
        if (action == Intent.ACTION_HEADSET_PLUG && state == 0 && preferSpeaker && isActive) {
          audioManager?.let {
            try {
              it.isSpeakerphoneOn = true
            } catch (e: Throwable) {
              android.util.Log.w("CharlotteAudioSession", "re-speaker failed", e)
            }
          }
        }

        sendEvent("onRouteChange", mapOf(
          "action" to action,
          "state" to state,
        ))
      }
    }
    context.registerReceiver(receiver, filter)
    headsetReceiver = receiver
  }

  private fun removeHeadsetReceiver() {
    headsetReceiver?.let { receiver ->
      try {
        appContext.reactContext?.unregisterReceiver(receiver)
      } catch (e: Throwable) {
        // already unregistered — ignore
      }
    }
    headsetReceiver = null
  }

  private fun typeName(type: Int): String = when (type) {
    AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "earpiece"
    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "speaker"
    AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired_headset"
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired_headphones"
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bt_sco"
    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bt_a2dp"
    AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_ACCESSORY -> "usb"
    else -> "other($type)"
  }
}
