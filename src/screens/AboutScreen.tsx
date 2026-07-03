// Acerca de / About — quién está detrás de ESTA app. El texto se inspira en la
// página del creador (Julián Rodríguez / Redder Labs) pero está reescrito para
// Spider Privacy Browser: no menciona otros productos (Noctcom, etc.), que no
// tienen relación con este navegador. El cuerpo se guarda por idioma (ES/EN).
//
// Los enlaces (GitHub, X, Web) se abren DENTRO de la propia app en una pestaña
// nueva y endurecida, vía onOpenUrl (App las enruta al navegador). Así no
// dependemos de que haya otro navegador instalado ni se filtra a uno externo.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { colors } from '../theme/theme';
import { APP_VERSION } from '../version';
import { InfoIcon } from '../components/icons';

interface AboutScreenProps {
  onClose: () => void;
  onOpenUrl: (url: string) => void;
}

// Enlaces del creador (mismo autor / marca) a sus otras webs. Son solo enlaces
// de contacto: el cuerpo del texto no describe esos otros productos.
const LINKS = {
  github: 'https://github.com/RedderLabs',
  x: 'https://x.com/noctcom',
  web: 'https://www.noctcom.com',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: 'rgba(13,13,15,0.8)' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#cabeff', lineHeight: 32 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 18, fontWeight: '700', color: '#cabeff', letterSpacing: -0.3 },
  headerSpacer: { width: 40 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  brand: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  logo: { width: 96, height: 82, marginBottom: 8 },
  wordmark: { fontSize: 20, fontWeight: '800', color: '#f4f2f7' },
  wordmarkAccent: { color: colors.primaryBright },
  version: { fontSize: 12, color: colors.faint, marginTop: 4 },

  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', color: '#e4e1e6', lineHeight: 31, letterSpacing: -0.4, marginBottom: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#cabeff', marginTop: 26, marginBottom: 10 },
  body: { fontSize: 14, color: '#c9c4d8', lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: '700', color: '#f4f2f7' },

  quoteWrap: { borderLeftWidth: 3, borderLeftColor: colors.primarySolid, paddingLeft: 14, paddingVertical: 4, marginBottom: 14 },
  quote: { fontSize: 15, fontStyle: 'italic', color: '#e4e1e6', lineHeight: 23 },

  card: { backgroundColor: 'rgba(31,31,34,0.6)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: '#e4e1e6' },
  linkValue: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 16 },

  security: { fontSize: 12, color: '#938ea1', lineHeight: 18, marginTop: 14 },

  codeBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(124,92,252,0.12)', borderWidth: 1, borderColor: 'rgba(124,92,252,0.35)' },
  codeBtnText: { fontSize: 14, fontWeight: '700', color: '#cabeff', letterSpacing: 0.3 },

  bottomSpacer: { height: 24 },
});

interface AboutContent {
  header: string;
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  s1Title: string;
  s1p1: string;
  quote: string;
  s1p2: string;
  s2Title: string;
  s2p1: string;
  s2p2: string;
  contactTitle: string;
  security: string;
  viewCode: string;
}

const boldName = (t: string) => <Text style={styles.bold}>{t}</Text>;

const ES: AboutContent = {
  header: 'Acerca de',
  eyebrow: 'Redder Labs · Independiente · Privacidad por diseño',
  title: 'Detrás de esta app hay una persona, no una corporación.',
  intro: (
    <Text style={styles.body}>
      Spider Privacy Browser lo construye {boldName('Julián Rodríguez')}, desarrollador autodidacta,
      bajo la marca {boldName('Redder Labs')}. Sin inversores, sin equipo de marketing, sin reuniones.
      Solo código y una idea fija: que tus datos no sean el producto.
    </Text>
  ),
  s1Title: 'Cómo llegué aquí',
  s1p1: 'Empecé a programar con 7 años, montando ordenadores por mi cuenta. A los 16 hice mis primeras webs. Todo lo demás vino igual: leyendo el código de otros y rompiendo cosas hasta entender por qué se rompían.',
  quote: '«Todo lo que sé lo aprendí leyendo código de otros, rompiendo cosas hasta entender por qué se rompían.»',
  s1p2: 'Trabajo en solitario, en mis horas, y me autofinancio. Eso marca el producto: nada depende de vender tu atención ni tus datos, porque no hay nadie a quien rendir esas cuentas más que a quien lo usa.',
  s2Title: 'Por qué funciona así',
  s2p1: 'El principio es siempre el mismo: el procesamiento ocurre en tu dispositivo, no en un servidor que te observa. En Spider Privacy Browser eso significa que el blindaje contra fingerprinting, el bloqueo de rastreadores y el DNS cifrado se aplican en el propio teléfono. Nada de tu navegación se recopila ni se envía a nadie.',
  s2p2: 'No es una opción que activas: es la única forma en que está construido. Y como todo lo que hago, el código es abierto (AGPL-3.0) para que no tengas que creerme: puedes comprobarlo línea a línea.',
  contactTitle: 'Hablemos',
  security: '¿Has encontrado un fallo de seguridad? Repórtalo de forma responsable siguiendo SECURITY.md.',
  viewCode: 'Ver el código en GitHub',
};

const EN: AboutContent = {
  header: 'About',
  eyebrow: 'Redder Labs · Independent · Privacy by design',
  title: 'Behind this app there is a person, not a corporation.',
  intro: (
    <Text style={styles.body}>
      Spider Privacy Browser is built by {boldName('Julián Rodríguez')}, a self-taught developer,
      under the {boldName('Redder Labs')} brand. No investors, no marketing team, no meetings. Just
      code and one fixed idea: that your data is not the product.
    </Text>
  ),
  s1Title: 'How I got here',
  s1p1: 'I started programming at 7, building computers on my own. At 16 I made my first websites. Everything else came the same way: reading other people’s code and breaking things until I understood why they broke.',
  quote: '“Everything I know I learned by reading other people’s code, breaking things until I understood why they broke.”',
  s1p2: 'I work alone, in my own hours, and I self-fund. That shapes the product: nothing depends on selling your attention or your data, because there is no one to answer to other than whoever uses it.',
  s2Title: 'Why it works this way',
  s2p1: 'The principle is always the same: processing happens on your device, not on a server that watches you. In Spider Privacy Browser that means the fingerprint hardening, tracker blocking and encrypted DNS all run on the phone itself. None of your browsing is collected or sent to anyone.',
  s2p2: 'It is not an option you switch on: it is the only way it is built. And like everything I make, the code is open (AGPL-3.0) so you don’t have to take my word for it: you can check it line by line.',
  contactTitle: 'Let’s talk',
  security: 'Found a security flaw? Report it responsibly following SECURITY.md.',
  viewCode: 'View the code on GitHub',
};

export const AboutScreen: React.FC<AboutScreenProps> = ({ onClose, onOpenUrl }) => {
  const lang = useSettingsStore((s) => s.language);
  const c = lang === 'en' ? EN : ES;

  // Opens the link in a new in-app hardened tab (this app IS the browser).
  const open = (url: string) => {
    onOpenUrl(url);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <InfoIcon size={18} color={colors.primary} />
          <Text style={styles.headerText}>{c.header}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App brand */}
        <View style={styles.brand}>
          <Image source={require('../../logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.wordmark}>
            Spider<Text style={styles.wordmarkAccent}>Privacy</Text> Browser
          </Text>
          <Text style={styles.version}>v{APP_VERSION}</Text>
        </View>

        <Text style={styles.eyebrow}>{c.eyebrow}</Text>
        <Text style={styles.title}>{c.title}</Text>
        {c.intro}

        <Text style={styles.sectionTitle}>{c.s1Title}</Text>
        <Text style={styles.body}>{c.s1p1}</Text>
        <View style={styles.quoteWrap}>
          <Text style={styles.quote}>{c.quote}</Text>
        </View>
        <Text style={styles.body}>{c.s1p2}</Text>

        <Text style={styles.sectionTitle}>{c.s2Title}</Text>
        <Text style={styles.body}>{c.s2p1}</Text>
        <Text style={styles.body}>{c.s2p2}</Text>

        <Text style={styles.sectionTitle}>{c.contactTitle}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7} onPress={() => open(LINKS.github)}>
            <Text style={styles.linkLabel}>GitHub</Text>
            <Text style={styles.linkValue}>RedderLabs ↗</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7} onPress={() => open(LINKS.x)}>
            <Text style={styles.linkLabel}>X</Text>
            <Text style={styles.linkValue}>@noctcom ↗</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7} onPress={() => open(LINKS.web)}>
            <Text style={styles.linkLabel}>Web</Text>
            <Text style={styles.linkValue}>noctcom.com ↗</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.security}>{c.security}</Text>

        <TouchableOpacity style={styles.codeBtn} activeOpacity={0.85} onPress={() => open(LINKS.github)}>
          <Text style={styles.codeBtnText}>{c.viewCode} ↗</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};
