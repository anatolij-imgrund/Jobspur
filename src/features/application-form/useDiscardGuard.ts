import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Alert } from 'react-native';

/**
 * Fragt nach, bevor ungespeicherte Eingaben durch Zurück-Geste
 * oder Zurück-Taste verloren gehen.
 */
export function useDiscardGuard(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    Alert.alert(
      'Eingaben verwerfen?',
      'Die Bewerbung ist noch nicht gespeichert.',
      [
        { text: 'Weiter bearbeiten', style: 'cancel' },
        {
          text: 'Verwerfen',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });
}
