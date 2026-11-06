import type { ExpoConfig } from 'expo/config';

/**
 * Brain Quest is fully offline. Release builds (EAS "preview" / "production")
 * additionally block the INTERNET permission so the APK physically cannot
 * talk to the network. Development builds keep it so Metro can serve the bundle.
 */
const profile = process.env.EAS_BUILD_PROFILE ?? '';
const isRelease = profile === 'preview' || profile === 'production';

const ALWAYS_BLOCKED = [
  'android.permission.RECORD_AUDIO',
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_CONTACTS',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.BLUETOOTH',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.WAKE_LOCK',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
];

const config: ExpoConfig = {
  name: 'Brain Quest',
  slug: 'brain-quest',
  scheme: 'brainquest',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#5BC0F8',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.brainquest.game',
  },
  android: {
    package: 'com.brainquest.game',
    adaptiveIcon: {
      backgroundColor: '#5BC0F8',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [],
    blockedPermissions: isRelease
      ? [...ALWAYS_BLOCKED, 'android.permission.INTERNET']
      : ALWAYS_BLOCKED,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#5BC0F8',
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  owner: 'mohdwaziddb',
  extra: {
    eas: { projectId: '8ad9460f-40e9-4dc3-9072-290043cf108a' },
  },
};

export default config;
