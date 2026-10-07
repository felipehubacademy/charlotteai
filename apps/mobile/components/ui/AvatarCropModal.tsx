import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Animated,
  PanResponder,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/components/ui/Text';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:        '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  border:    'rgba(22,19,31,0.10)',
  green:     '#DCFF4A',
  greenDark: '#08804A',
  overlay:   'rgba(22,19,31,0.85)',
  error:     '#D12A64',
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CROP_SIZE = 280; // circular crop preview diameter
const MIN_SCALE = 1.0;
const MAX_SCALE = 5.0;

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string | null;
  onSaved: (url: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AvatarCropModal({
  isOpen,
  onClose,
  userId,
  currentAvatarUrl,
  onSaved,
}: AvatarCropModalProps) {
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [imageSize, setImageSize]     = useState<{ width: number; height: number } | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [phase, setPhase]             = useState<'pick' | 'crop'>('pick');

  // Animated pan & scale
  const pan   = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Track raw values (not just animated) for crop math
  const panOffset   = useRef({ x: 0, y: 0 });
  const scaleOffset = useRef(1);

  // PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        // Flatten current offsets so delta starts from zero
        pan.setOffset(panOffset.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        panOffset.current = {
          x: panOffset.current.x + gesture.dx,
          y: panOffset.current.y + gesture.dy,
        };
      },
    })
  ).current;

  // ── Reset on close ──────────────────────────────────────────────────────────
  // Declared BEFORE handleSave to avoid closure ordering issues.
  const handleClose = useCallback(() => {
    setImageUri(null);
    setImageSize(null);
    setPhase('pick');
    panOffset.current   = { x: 0, y: 0 };
    scaleOffset.current = 1;
    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);
    onClose();
  }, [onClose, pan, scale]);

  // Stable ref so handleSave can call the latest handleClose without dep issues
  const handleCloseRef = useRef(handleClose);
  useEffect(() => { handleCloseRef.current = handleClose; }, [handleClose]);

  // ── Pick image ──────────────────────────────────────────────────────────────
  const pickFromLibrary = useCallback(async () => {
    try {
      // expo-image-picker v15+ uses PHPickerViewController on iOS which does NOT
      // require explicit photo library permission — the system handles access
      // internally. Calling requestMediaLibraryPermissionsAsync() here triggered
      // a legacy permission flow that crashed when launched inside a fullScreen Modal.
      // Delay lets the Modal fully settle before the native picker presents on top.
      await new Promise(r => setTimeout(r, 350));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        loadImage(asset.uri, asset.width ?? 0, asset.height ?? 0);
      }
    } catch (err: any) {
      console.error('[AvatarCropModal] pickFromLibrary error:', err);
      Alert.alert('Erro', 'Não foi possível abrir a galeria. Tente novamente.');
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso à câmera nas Configurações do iPhone > Charlotte.'
        );
        return;
      }
      await new Promise(r => setTimeout(r, 100));
      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        loadImage(asset.uri, asset.width ?? 0, asset.height ?? 0);
      }
    } catch (err: any) {
      console.error('[AvatarCropModal] pickFromCamera error:', err);
      Alert.alert('Erro', 'Não foi possível abrir a câmera. Tente novamente.');
    }
  }, []);

  const loadImage = (uri: string, w: number, h: number) => {
    // Reset pan & scale
    panOffset.current   = { x: 0, y: 0 };
    scaleOffset.current = 1;
    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);

    setImageUri(uri);
    // If dimensions are missing (rare), fall back to square — crop math won't break
    setImageSize({ width: w || 1000, height: h || 1000 });
    setPhase('crop');
  };

  // ── Save / Upload ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!imageUri || !imageSize) return;
    setUploading(true);
    try {
      // --- Compute crop rect ---
      // The displayed image fills CROP_SIZE at scale=1 (we fit the smaller side).
      const fitScale = CROP_SIZE / Math.min(imageSize.width, imageSize.height);
      const displayedW = imageSize.width  * fitScale;
      const displayedH = imageSize.height * fitScale;

      // Current user pan & zoom (read synchronously from ref offsets)
      const currentPanX  = panOffset.current.x;
      const currentPanY  = panOffset.current.y;
      const currentScale = scaleOffset.current;

      // The image origin (top-left) in crop-area coordinates:
      const originX = (CROP_SIZE - displayedW * currentScale) / 2 + currentPanX;
      const originY = (CROP_SIZE - displayedH * currentScale) / 2 + currentPanY;

      // Map the crop square [0..CROP_SIZE] back to source-image pixels
      const srcX = Math.max(0, (-originX) / (fitScale * currentScale));
      const srcY = Math.max(0, (-originY) / (fitScale * currentScale));
      const srcSize = CROP_SIZE / (fitScale * currentScale);

      const clampedSrcX    = Math.min(srcX,    imageSize.width  - 1);
      const clampedSrcY    = Math.min(srcY,    imageSize.height - 1);
      const clampedSrcSize = Math.min(srcSize, Math.min(imageSize.width - clampedSrcX, imageSize.height - clampedSrcY));

      // --- Manipulate ---
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: clampedSrcX,
              originY: clampedSrcY,
              width:   clampedSrcSize,
              height:  clampedSrcSize,
            },
          },
          { resize: { width: 400, height: 400 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      // --- Upload to Supabase Storage ---
      // Use expo-file-system to read as base64, then convert to Uint8Array.
      // This is the reliable approach in React Native (fetch().blob() can be
      // unreliable for file:// URIs on iOS in production builds).
      const path = `${userId}/avatar.jpg`;

      const base64 = await readAsStringAsync(manipulated.uri, {
        encoding: 'base64',
      });

      // atob is available in React Native 0.72+ (Hermes)
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // --- Get public URL ---
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Cache-buster so re-uploads show immediately (same path, different URL)
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // --- Update DB ---
      const { error: dbError } = await supabase
        .from('charlotte_users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (dbError) throw dbError;

      onSaved(publicUrl);
      handleCloseRef.current();
    } catch (err: any) {
      console.error('[AvatarCropModal] upload error:', err);
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar a foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [imageUri, imageSize, userId, onSaved]);

  // ── Compute image display size for crop view ────────────────────────────────
  const imageDisplayStyle = imageSize
    ? (() => {
        const fitScale = CROP_SIZE / Math.min(imageSize.width, imageSize.height);
        return {
          width:  imageSize.width  * fitScale,
          height: imageSize.height * fitScale,
        };
      })()
    : { width: CROP_SIZE, height: CROP_SIZE };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} disabled={uploading}>
            <AppText style={[styles.headerBtnText, { color: C.navyMid }]}>Cancelar</AppText>
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>Foto do perfil</AppText>
          {phase === 'crop' ? (
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.headerBtn, styles.saveBtn]}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size="small" color={C.navy} />
                : <AppText style={[styles.headerBtnText, { color: C.navy, fontWeight: '700' }]}>Salvar</AppText>
              }
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {/* Body */}
        <View style={styles.body}>
          {phase === 'pick' ? (
            /* ── Pick phase ─────────────────────────────────── */
            <View style={styles.pickContainer}>
              {/* Current avatar preview */}
              {currentAvatarUrl ? (
                <Image
                  source={{ uri: currentAvatarUrl }}
                  style={styles.currentAvatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <AppText style={styles.avatarPlaceholderText}>Sem foto</AppText>
                </View>
              )}

              <AppText style={styles.pickTitle}>Escolha uma foto</AppText>
              <AppText style={styles.pickSubtitle}>
                Escolha da galeria ou tire uma nova foto.{'\n'}
                Você pode recortar e dar zoom antes de salvar.
              </AppText>

              <TouchableOpacity style={styles.pickButton} onPress={pickFromLibrary}>
                <AppText style={styles.pickButtonText}>Escolher da galeria</AppText>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.pickButton, styles.pickButtonSecondary]} onPress={pickFromCamera}>
                <AppText style={[styles.pickButtonText, { color: C.navy }]}>Tirar uma foto</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Crop phase ─────────────────────────────────── */
            <View style={styles.cropContainer}>
              <AppText style={styles.cropHint}>Arraste ou use os botoes para ajustar</AppText>

              {/* Circular crop frame */}
              <View style={styles.cropFrame} {...panResponder.panHandlers}>
                <Animated.Image
                  source={{ uri: imageUri! }}
                  style={[
                    styles.cropImage,
                    {
                      width:  imageDisplayStyle.width,
                      height: imageDisplayStyle.height,
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale },
                      ],
                    },
                  ]}
                  resizeMode="cover"
                />
              </View>

              {/* Zoom controls */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => {
                    const next = Math.max(MIN_SCALE, scaleOffset.current - 0.25);
                    scaleOffset.current = next;
                    Animated.spring(scale, { toValue: next, useNativeDriver: false }).start();
                  }}
                >
                  <AppText style={styles.zoomBtnText}>-</AppText>
                </TouchableOpacity>
                <AppText style={styles.zoomLabel}>Zoom</AppText>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => {
                    const next = Math.min(MAX_SCALE, scaleOffset.current + 0.25);
                    scaleOffset.current = next;
                    Animated.spring(scale, { toValue: next, useNativeDriver: false }).start();
                  }}
                >
                  <AppText style={styles.zoomBtnText}>+</AppText>
                </TouchableOpacity>
              </View>

              {/* Change photo */}
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={() => setPhase('pick')}
                disabled={uploading}
              >
                <AppText style={styles.changePhotoText}>Trocar foto</AppText>
              </TouchableOpacity>

              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={C.green} />
                  <AppText style={styles.uploadingText}>Salvando...</AppText>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    height: 56 + (Platform.OS === 'ios' ? 44 : 24),
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  headerBtn: {
    minWidth: 72,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBtnText: {
    fontSize: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.navy,
  },
  saveBtn: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingHorizontal: 14,
  },

  // Body
  body: {
    flex: 1,
  },

  // Pick phase
  pickContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  currentAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: C.green,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(220,255,74,0.10)',
    borderWidth: 2,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarPlaceholderText: {
    fontSize: 12,
    color: C.navyLight,
  },
  pickTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.navy,
    textAlign: 'center',
  },
  pickSubtitle: {
    fontSize: 13,
    color: C.navyLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  pickButton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonSecondary: {
    backgroundColor: 'rgba(22,19,31,0.06)',
  },
  pickButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.navy,
  },

  // Crop phase
  cropContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 24,
  },
  cropHint: {
    fontSize: 13,
    color: C.navyLight,
    marginBottom: 4,
  },
  cropFrame: {
    width:  CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#EEE',
    borderWidth: 3,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropImage: {
    position: 'absolute',
  },

  // Zoom controls
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22,19,31,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: C.navy,
    lineHeight: 26,
  },
  zoomLabel: {
    fontSize: 13,
    color: C.navyLight,
    fontWeight: '600',
  },

  changePhotoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  changePhotoText: {
    fontSize: 14,
    color: C.navyMid,
    textDecorationLine: 'underline',
  },

  // Uploading overlay
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 0,
  },
  uploadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.navy,
  },
});
