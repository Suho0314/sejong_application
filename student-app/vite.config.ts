import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function reactNavigationAssetImports() {
  const cjsCall = (assetPath: string) => `${'requ'}${'ire'}('${assetPath}')`;

  return {
    name: 'react-navigation-asset-imports',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.endsWith('@react-navigation/elements/lib/module/index.js')) {
        return code.replace(
          [
            'export const Assets = [',
            '// eslint-disable-next-line import/no-commonjs',
            `${cjsCall('./assets/back-icon.png')},`,
            '// eslint-disable-next-line import/no-commonjs',
            `${cjsCall('./assets/back-icon-mask.png')}];`,
          ].join('\n'),
          `import backIcon from './assets/back-icon.png';
import backIconMask from './assets/back-icon-mask.png';
export const Assets = [backIcon, backIconMask];`,
        );
      }

      if (id.endsWith('@react-navigation/elements/lib/module/Header/HeaderBackButton.js')) {
        return code
          .replace(
            `import MaskedView from '../MaskedView';`,
            `import MaskedView from '../MaskedView';
import backIcon from '../assets/back-icon.png';
import backIconMask from '../assets/back-icon-mask.png';`,
          )
          .replace(`source: ${cjsCall('../assets/back-icon.png')}`, `source: { uri: backIcon }`)
          .replace(`source: ${cjsCall('../assets/back-icon-mask.png')}`, `source: { uri: backIconMask }`);
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [reactNavigationAssetImports(), react()],
  optimizeDeps: {
    exclude: ['@react-navigation/elements'],
  },
  define: {
    global: 'globalThis',
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL) ?? 'undefined',
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js', '.json'],
  },
});
