import { Tabs } from 'expo-router';
import { WhatsAppTabBar } from '../../components/navigation/WhatsAppTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false
      }}
      tabBar={props => <WhatsAppTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil'
        }}
      />
      <Tabs.Screen
        name="controls/index"
        options={{
          title: 'Contrôles'
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          href: null
        }}
      />
      <Tabs.Screen
        name="reports/index"
        options={{
          title: 'Rapports'
        }}
      />
      <Tabs.Screen
        name="incidents/index"
        options={{
          title: 'Incidents'
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil'
        }}
      />
    </Tabs>
  );
}
