import { Modal, View, Linking, TouchableOpacity } from 'react-native';
import { Timer, WhatsappLogo, SignOut } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';

const WHATSAPP_URL = 'https://wa.me/5500000000000?text=Olá! Quero continuar usando a Charlotte.';

export function TrialExpiredModal() {
  const { profile, hasAccess, signOut } = useAuth();
  // Aviso de assinatura/acesso = sistema: idioma segue o device.
  const isPt = systemIsPt;

  // Mostra se logado mas sem acesso (trial expirado, inativo, ou sem assinatura)
  const visible = !!profile && !hasAccess;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#1A1939', borderRadius: 20, padding: 28, width: '100%', gap: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>

          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(163,255,60,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Timer size={30} color="#A3FF3C" weight="duotone" />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' }}>
              {isPt ? 'Acesso encerrado' : 'Access expired'}
            </AppText>
            <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 }}>
              {isPt
                ? 'Seu período de acesso expirou. Fale com nossa equipe para continuar praticando com a Charlotte.'
                : 'Your access period has expired. Contact our team to continue practising with Charlotte.'}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL(WHATSAPP_URL)}
            style={{ backgroundColor: '#A3FF3C', borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <WhatsappLogo size={18} color="#16153A" weight="fill" />
            <AppText style={{ color: '#16153A', fontWeight: '700', fontSize: 15 }}>
              {isPt ? 'Falar com a equipe' : 'Contact the team'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 }}
          >
            <SignOut size={15} color="rgba(255,255,255,0.35)" weight="regular" />
            <AppText style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              {isPt ? 'Sair da conta' : 'Sign out'}
            </AppText>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}
