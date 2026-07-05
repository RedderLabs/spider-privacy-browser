// Lightweight line icons drawn with plain Views — no react-native-svg (avoids a
// native dependency / build risk). Each takes a color + size so callers can tint
// by state. Kept intentionally simple; good enough for the browser chrome.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
  disabled?: boolean;
}

const DEFAULT = '#c9c4d8';

// ☰ hamburger — three stacked bars.
export const MenuIcon: React.FC<IconProps> = ({ size = 24, color = DEFAULT }) => (
  <View style={{ width: size, height: size, justifyContent: 'center' }}>
    {[0, 1, 2].map((i) => (
      <View
        key={i}
        style={{ height: 2, borderRadius: 2, backgroundColor: color, marginVertical: size * 0.11 }}
      />
    ))}
  </View>
);

// Chevron used for back/forward — a corner of a box, rotated 45°.
const Chevron: React.FC<IconProps & { dir: 'left' | 'right' }> = ({ size = 22, color = DEFAULT, disabled, dir }) => {
  const s = size * 0.5;
  const left = dir === 'left';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.28 : 1 }}>
      <View
        style={{
          width: s,
          height: s,
          borderColor: color,
          borderLeftWidth: left ? 2.5 : 0,
          borderRightWidth: left ? 0 : 2.5,
          borderBottomWidth: 2.5,
          borderTopWidth: left ? 0 : 0,
          transform: [{ rotate: left ? '45deg' : '-45deg' }],
          marginLeft: left ? size * 0.12 : -size * 0.12,
        }}
      />
    </View>
  );
};

export const BackIcon: React.FC<IconProps> = (p) => <Chevron {...p} dir="left" />;
export const ForwardIcon: React.FC<IconProps> = (p) => <Chevron {...p} dir="right" />;

// ⌂ home — roof triangle + body.
export const HomeIcon: React.FC<IconProps> = ({ size = 22, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.5,
        borderRightWidth: size * 0.5,
        borderBottomWidth: size * 0.42,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
    <View
      style={{
        width: size * 0.6,
        height: size * 0.36,
        backgroundColor: color,
        marginTop: -1,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
      }}
    />
  </View>
);

// Tab switcher — rounded square holding the open-tab count.
export const TabsIcon: React.FC<IconProps & { count: number }> = ({ size = 22, color = DEFAULT, count }) => (
  <View
    style={{
      width: size * 0.95,
      height: size * 0.95,
      borderWidth: 2,
      borderColor: color,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    <Text style={{ color, fontSize: size * 0.48, fontWeight: '700' }}>{count}</Text>
  </View>
);

// 🔍 search — a bordered ring with a diagonal handle at ~4 o'clock.
export const SearchIcon: React.FC<IconProps> = ({ size = 22, color = DEFAULT }) => {
  const d = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          width: 2.4,
          height: size * 0.24,
          borderRadius: 2,
          backgroundColor: color,
          right: size * 0.18,
          bottom: size * 0.16,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
};

// ⚙ settings — "tune" style: three sliders, each a line with a knob. Easier to
// render cleanly with Views than a toothed gear, and reads unambiguously.
// `bg` is the surface behind, used to punch the knob out of the line.
export const SettingsIcon: React.FC<IconProps & { bg?: string }> = ({
  size = 22,
  color = DEFAULT,
  bg = '#17171b',
}) => {
  const rows = [0.12, 0.58, 0.34]; // knob x-position per row (fraction of size)
  const knob = size * 0.22;
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-evenly', paddingVertical: size * 0.1 }}>
      {rows.map((x, i) => (
        <View key={i} style={{ height: knob, justifyContent: 'center' }}>
          <View style={{ height: 2, borderRadius: 2, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              borderWidth: 2,
              borderColor: color,
              backgroundColor: bg,
              left: x * size,
            }}
          />
        </View>
      ))}
    </View>
  );
};

// 🌐 globe — a ring with a meridian ellipse + equator line.
export const GlobeIcon: React.FC<IconProps> = ({ size = 22, color = DEFAULT }) => {
  const d = size * 0.82;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 2, borderColor: color }} />
      <View style={{ position: 'absolute', width: d * 0.5, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', width: d, height: 1.5, backgroundColor: color }} />
    </View>
  );
};

// 🎨 canvas — an image frame (sun + mountain), for canvas-fingerprint defense.
export const CanvasIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View
      style={{
        width: size * 0.84,
        height: size * 0.84,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: color,
        overflow: 'hidden',
        justifyContent: 'flex-end',
      }}>
      <View style={{ position: 'absolute', top: size * 0.12, left: size * 0.14, width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          alignSelf: 'center',
          marginBottom: size * 0.06,
          borderLeftWidth: size * 0.24,
          borderRightWidth: size * 0.24,
          borderBottomWidth: size * 0.3,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    </View>
  </View>
);

// 🖥 monitor — screen + stand, for WebGL/GPU spoofing.
export const MonitorIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.86, height: size * 0.58, borderRadius: 3, borderWidth: 2, borderColor: color }} />
    <View style={{ width: 2, height: size * 0.1, backgroundColor: color }} />
    <View style={{ width: size * 0.38, height: 2, borderRadius: 2, backgroundColor: color }} />
  </View>
);

// 🔤 font — the "Aa" glyph (crisp, uses the platform font — not an emoji).
export const FontIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.82, fontWeight: '700', lineHeight: size }}>Aa</Text>
  </View>
);

// 📱 device — a phone body with speaker + home button, for navigator spoofing.
export const DeviceIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View
      style={{
        width: size * 0.58,
        height: size * 0.88,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: size * 0.09,
      }}>
      <View style={{ width: size * 0.18, height: 2, borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07, borderWidth: 1.5, borderColor: color }} />
    </View>
  </View>
);

// 🕐 clock — dial + L-shaped hands, for timezone→UTC.
export const ClockIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.86, height: size * 0.86, borderRadius: size * 0.43, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute' }}>
        <View style={{ position: 'absolute', width: 2, height: size * 0.24, borderRadius: 2, backgroundColor: color, left: -1, top: -(size * 0.24) }} />
        <View style={{ position: 'absolute', width: size * 0.18, height: 2, borderRadius: 2, backgroundColor: color, top: -1, left: 0 }} />
      </View>
    </View>
  </View>
);

// 🍪 cookie — a disc with chips, for cookie consent/blocking.
export const CookieIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => {
  const chip = (top: number, left: number, s = 0.12) => (
    <View style={{ position: 'absolute', top: size * top, left: size * left, width: size * s, height: size * s, borderRadius: size * s, backgroundColor: color }} />
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.86, height: size * 0.86, borderRadius: size * 0.43, borderWidth: 2, borderColor: color }}>
        {chip(0.2, 0.24)}
        {chip(0.5, 0.48, 0.14)}
        {chip(0.54, 0.18)}
        {chip(0.24, 0.54, 0.1)}
      </View>
    </View>
  );
};

// 🗑 trash — lid + body, for clear-on-close.
export const TrashIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.2, height: 2, borderRadius: 2, backgroundColor: color, marginBottom: 1 }} />
    <View style={{ width: size * 0.74, height: 2, borderRadius: 2, backgroundColor: color }} />
    <View style={{ width: size * 0.56, height: size * 0.56, borderWidth: 2, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 1 }} />
  </View>
);

// 📖 book — a bound book, for history.
export const BookIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.82, borderWidth: 2, borderColor: color, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 2, height: size * 0.82, backgroundColor: color, left: size * 0.32 }} />
      <View style={{ width: size * 0.24, height: 1.5, backgroundColor: color, marginLeft: size * 0.2, marginTop: -size * 0.14 }} />
      <View style={{ width: size * 0.24, height: 1.5, backgroundColor: color, marginLeft: size * 0.2, marginTop: size * 0.1 }} />
    </View>
  </View>
);

// 🔒 lock — shackle + body with a punched keyhole (`bg` = surface behind).
export const LockIcon: React.FC<IconProps & { bg?: string }> = ({ size = 18, color = DEFAULT, bg = '#0D0D0F' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.5, height: size * 0.36, borderWidth: 2, borderColor: color, borderBottomWidth: 0, borderTopLeftRadius: size * 0.25, borderTopRightRadius: size * 0.25, marginBottom: -1 }} />
    <View style={{ width: size * 0.68, height: size * 0.5, borderRadius: 3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.1, height: size * 0.18, borderRadius: size * 0.05, backgroundColor: bg }} />
    </View>
  </View>
);

// 🔑 key — ring + stem with a tooth, for the DoH-over-VPN resolver.
export const KeyIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, borderWidth: 2, borderColor: color }} />
    <View style={{ width: size * 0.34, height: 2, borderRadius: 2, backgroundColor: color, alignSelf: 'center' }} />
    <View style={{ width: 2, height: size * 0.2, borderRadius: 2, backgroundColor: color, alignSelf: 'flex-end', marginLeft: -size * 0.1, marginBottom: size * 0.08 }} />
  </View>
);

// 🧅 onion — layered bulb with a stem, for Tor/Orbot routing.
export const OnionIcon: React.FC<IconProps> = ({ size = 18, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 2, height: size * 0.14, backgroundColor: color, marginBottom: -1 }} />
    <View style={{ width: size * 0.74, height: size * 0.74, borderRadius: size * 0.37, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.36, height: size * 0.42, borderRadius: size * 0.18, borderWidth: 1.5, borderColor: color }} />
    </View>
  </View>
);

// ⚠️ warning — filled triangle with a punched exclamation (`bg` = surface behind).
export const WarnIcon: React.FC<IconProps & { bg?: string }> = ({ size = 48, color = DEFAULT, bg = '#1A1A1F' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.5,
        borderRightWidth: size * 0.5,
        borderBottomWidth: size * 0.86,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
    <View style={{ position: 'absolute', bottom: size * 0.12, alignItems: 'center' }}>
      <View style={{ width: size * 0.08, height: size * 0.3, borderRadius: size * 0.04, backgroundColor: bg }} />
      <View style={{ width: size * 0.09, height: size * 0.09, borderRadius: size * 0.05, backgroundColor: bg, marginTop: size * 0.05 }} />
    </View>
  </View>
);

// ⓘ info — a ringed circle with an "i" glyph, for the About entry.
export const InfoIcon: React.FC<IconProps & { bg?: string }> = ({ size = 20, color = DEFAULT }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.06, backgroundColor: color, marginBottom: size * 0.05 }} />
      <View style={{ width: size * 0.11, height: size * 0.34, borderRadius: size * 0.05, backgroundColor: color }} />
    </View>
  </View>
);

// ⋮ more — three vertical dots.
export const MoreIcon: React.FC<IconProps> = ({ size = 22, color = DEFAULT }) => (
  <View style={{ height: size, justifyContent: 'center', alignItems: 'center' }}>
    {[0, 1, 2].map((i) => (
      <View
        key={i}
        style={{
          width: size * 0.17,
          height: size * 0.17,
          borderRadius: size * 0.1,
          backgroundColor: color,
          marginVertical: size * 0.06,
        }}
      />
    ))}
  </View>
);

// Shield with a check — the privacy/hardening indicator (top-right). `bg` is the
// surface colour behind it, used to punch the check mark out of the shield.
export const ShieldCheckIcon: React.FC<IconProps & { bg?: string }> = ({
  size = 24,
  color = DEFAULT,
  bg = '#0D0D0F',
}) => {
  const w = size * 0.8;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-start' }}>
      <View style={{ width: w, height: size * 0.44, backgroundColor: color, borderTopLeftRadius: w * 0.42, borderTopRightRadius: w * 0.42 }} />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderTopWidth: size * 0.4,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          marginTop: -1,
        }}
      />
      {/* check mark, punched out in the surface colour */}
      <View style={[styles.checkWrap, { top: size * 0.2 }]}>
        <View style={{ width: 2.6, height: size * 0.14, backgroundColor: bg, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
        <View style={{ width: 2.6, height: size * 0.26, backgroundColor: bg, borderRadius: 2, transform: [{ rotate: '-45deg' }], marginLeft: -1 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  checkWrap: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end' },
});
