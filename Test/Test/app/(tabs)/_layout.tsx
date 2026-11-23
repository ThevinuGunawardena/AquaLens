import { tabs } from "@/constants/data";
import { components } from "@/constants/theme";
import type { RootState } from "@/store";
import { Tabs } from "expo-router";
import { Award, BookOpen, Home, Settings, User } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const tabBar = components.tabBar;
const ICON_SIZE = 22;

const getTabIcon = (name: string, focused: boolean, color: string) => {
  switch (name) {
    case "index":
      return <Home size={ICON_SIZE} color={color} />;
    case "dictionary":
      return <BookOpen size={ICON_SIZE} color={color} />;
    case "certificate":
      return <Award size={ICON_SIZE} color={color} />;
    case "profile":
      return <User size={ICON_SIZE} color={color} />;
    case "settings":
      return <Settings size={ICON_SIZE} color={color} />;
    default:
      return <Home size={ICON_SIZE} color={color} />;
  }
};

const TabIcon = ({
  focused,
  name,
  accentColor,
  mutedColor,
}: {
  focused: boolean;
  name: string;
  accentColor: string;
  mutedColor: string;
}) => {
  const iconColor = focused ? "#081126" : mutedColor;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={[
          {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
          },
          focused && { backgroundColor: accentColor },
        ]}
      >
        {getTabIcon(name, focused, iconColor)}
      </View>
    </View>
  );
};

const TabLayout = () => {
  const insets = useSafeAreaInsets();
  const colors = useSelector((state: RootState) => state.theme.colors);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, 12),
          height: tabBar.height,
          marginHorizontal: tabBar.horizontalInset,
          borderRadius: tabBar.radius,
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.border,
          borderWidth: 1,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          paddingVertical: (tabBar.height - 44) / 2,
        },
        tabBarIconStyle: {
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                name={tab.name}
                accentColor={colors.accent}
                mutedColor={colors.mutedForeground}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;
