import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Alert } from 'react-native';

/**
 * Fragt nach, bevor ungespeicherte Eingaben durch Zurück-Geste
 * oder Zurück-Taste verloren gehen.
 */
export function useDiscardGuard(
  hasUnsavedChanges: boolean,
  message = 'Deine Eingaben sind noch nicht gespeichert.',
) {
  const navigation = useNavigation();

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    Alert.alert('Eingaben verwerfen?', message, [
      { text: 'Weiter bearbeiten', style: 'cancel' },
      {
        text: 'Verwerfen',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });
}
