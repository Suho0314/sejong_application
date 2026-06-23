import { AppRegistry } from 'react-native';
import App from '../App';

AppRegistry.registerComponent('StudentApp', () => App);
AppRegistry.runApplication('StudentApp', {
  rootTag: document.getElementById('root'),
});
