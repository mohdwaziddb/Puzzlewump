/* Lightweight react-native-reanimated mock for jest (the bundled mock crashes under jest-expo with Reanimated 4). */
const RN = require('react-native');

const id = (v) => v;
const chain = new Proxy(function () {}, {
  get: (_t, p) => (p === 'build' ? () => () => ({}) : chain),
  apply: () => chain,
});
const createAnimatedComponent = (C) => C;
const Animated = {
  View: RN.View,
  Text: RN.Text,
  Image: RN.Image,
  ScrollView: RN.ScrollView,
  FlatList: RN.FlatList,
  createAnimatedComponent,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  createAnimatedComponent,
  useSharedValue: (v) => ({ value: v, get: () => v, set() {}, modify() {} }),
  useAnimatedStyle: (fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  useAnimatedProps: (fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  useDerivedValue: (fn) => ({ value: (() => { try { return fn(); } catch { return 0; } })() }),
  useAnimatedReaction: () => {},
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => () => {},
  useFrameCallback: () => ({ setActive() {} }),
  withTiming: id,
  withSpring: id,
  withDelay: (_d, v) => v,
  withSequence: (...v) => v[v.length - 1],
  withRepeat: id,
  withDecay: () => 0,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (_v, _i, o) => o[0],
  interpolateColor: (_v, _i, o) => o[0],
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: new Proxy({}, { get: () => (x) => (typeof x === 'function' ? x : (t) => t) }),
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  // layout animations (FadeIn, ZoomIn.springify() ...)
  FadeIn: chain, FadeOut: chain, FadeInDown: chain, FadeInUp: chain, FadeOutDown: chain, FadeOutUp: chain,
  ZoomIn: chain, ZoomOut: chain, BounceIn: chain, BounceOut: chain, SlideInDown: chain, SlideInUp: chain,
  SlideOutDown: chain, SlideInLeft: chain, SlideInRight: chain, SlideOutLeft: chain, SlideOutRight: chain,
  LinearTransition: chain, Layout: chain, FadeInLeft: chain, FadeInRight: chain, ZoomInDown: chain, ZoomInUp: chain,
  BounceInDown: chain, BounceInUp: chain, StretchInX: chain, RotateInDownLeft: chain, PinwheelIn: chain,
};
