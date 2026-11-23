import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function SubscriptionPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View>
      <Text>Subscription: {id}</Text>
    </View>
  );
}
