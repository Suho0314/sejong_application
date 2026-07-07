import { AppRegistry } from 'react-native';
import App from '../App';

const runtimeGlobal = globalThis as typeof globalThis & {
  global?: typeof globalThis;
};

if (typeof runtimeGlobal.global === 'undefined') {
  runtimeGlobal.global = globalThis;
}

AppRegistry.registerComponent('StudentApp', () => App);
AppRegistry.runApplication('StudentApp', {
  rootTag: document.getElementById('root'),
});
