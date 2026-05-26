import { usePathname } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { cn } from '../../lib/cn';
import { ROLE_LABELS, routeKeyForPathname, type RouteKey } from '../../lib/models';
import { getItem, setItem } from '../../lib/storage';
import { useAppStore } from '../../lib/store';
import type { IconName } from './Icon';
import { Icon } from './Icon';

type Action = {
  icon: IconName;
  onPress: () => void;
  label: string;
};

type HelpContent = {
  title: string;
  summary: string;
  bullets: string[];
};

const HELP_PREFERENCE_PREFIX = 'p5_help_pref_v1';

const PAGE_TAGS: Record<RouteKey, string> = {
  home: 'Tableau de bord',
  profile: 'Compte',
  'controls:list': 'Controles',
  'controls:detail': 'Execution',
  'controls:plan': 'Planification',
  'incidents:list': 'Incidents',
  'incidents:detail': 'Suivi',
  'incidents:edit': 'Declaration',
  planning: 'Agenda',
  sites: 'Sites',
  templates: 'Modeles',
  reports: 'Rapports',
  unknown: 'Page'
};

function normalizeUserScope(userName: string) {
  const clean = userName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 48);
  return clean || 'anonymous';
}

function preferenceKeyForRoute(pathname: string, userName: string) {
  const routeKey = routeKeyForPathname(pathname);
  if (routeKey === 'unknown') return null;
  return `${HELP_PREFERENCE_PREFIX}:${normalizeUserScope(userName)}:${routeKey}`;
}

function pageTagForPathname(pathname: string) {
  return PAGE_TAGS[routeKeyForPathname(pathname)] ?? PAGE_TAGS.unknown;
}

function ActionButton({
  action,
  showLabel,
  colorScheme,
  size,
  tone = 'default',
  stretch = false,
  onPress
}: {
  action: Action;
  showLabel: boolean;
  colorScheme: 'light' | 'dark';
  size: number;
  tone?: 'default' | 'primary';
  stretch?: boolean;
  onPress?: () => void;
}) {
  const isDark = colorScheme === 'dark';
  const isPrimary = tone === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={showLabel ? undefined : `${action.label}.`}
      focusable
      onPress={onPress ?? action.onPress}
      style={({ pressed }) => ({
        minHeight: size,
        minWidth: showLabel ? size + 28 : size,
        width: stretch ? '100%' : showLabel ? undefined : size,
        paddingHorizontal: showLabel ? 14 : 0,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.92 : 1,
        borderWidth: 1,
        borderColor: isPrimary ? '#2E5BFF' : isDark ? '#22314A' : '#D6E2FF',
        backgroundColor: isPrimary ? '#2E5BFF' : isDark ? '#0F1A2E' : '#FFFFFF'
      })}
      className="rounded-2xl items-center justify-center"
    >
      <View className="flex-row items-center justify-center">
        <Icon
          name={action.icon}
          size={showLabel ? 18 : 20}
          color={isPrimary ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A'}
          strokeWidth={2.3}
        />
        {showLabel ? (
          <Text className={cn('ml-2 text-[13px] font-semibold', isPrimary ? 'text-white' : isDark ? 'text-white' : 'text-slate-900')}>
            {action.label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function MetaPill({
  label,
  colorScheme,
  tone = 'default'
}: {
  label: string;
  colorScheme: 'light' | 'dark';
  tone?: 'default' | 'accent';
}) {
  const isDark = colorScheme === 'dark';
  const isAccent = tone === 'accent';

  return (
    <View
      className="rounded-full border px-3 py-1"
      style={{
        borderColor: isAccent ? (isDark ? 'rgba(96,165,250,0.24)' : '#BFDBFE') : isDark ? 'rgba(255,255,255,0.08)' : '#D6E2FF',
        backgroundColor: isAccent ? (isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF') : isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'
      }}
    >
      <Text className={cn('text-[11px] font-semibold tracking-[0.35px]', isAccent ? 'text-brand-200 dark:text-brand-100' : isDark ? 'text-white/88' : 'text-slate-700')}>
        {label}
      </Text>
    </View>
  );
}

function HelpBullet({
  index,
  text,
  colorScheme
}: {
  index: number;
  text: string;
  colorScheme: 'light' | 'dark';
}) {
  const isDark = colorScheme === 'dark';

  return (
    <View
      className={cn('flex-row items-start rounded-2xl border px-4 py-3', isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100')}
      style={{ gap: 12 }}
    >
      <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-600">
        <Text className="text-[12px] font-bold text-white">{index + 1}</Text>
      </View>
      <Text className={cn('flex-1 text-[14px] leading-6', isDark ? 'text-slate-100' : 'text-slate-800')}>{text}</Text>
    </View>
  );
}

function helpContentForPathname(pathname: string, roleLabel: string): HelpContent | null {
  const key = routeKeyForPathname(pathname);
  switch (key) {
    case 'home':
      return {
        title: 'Accueil',
        summary: `Vue rapide de ta journée. Rôle : ${roleLabel}.`,
        bullets: [
          'Voir les contrôles et incidents du jour',
          'Préparer la tournée',
          'Ouvrir les rapports'
        ]
      };
    case 'controls:list':
      return {
        title: 'Contrôles',
        summary: 'Liste des contrôles planifiés.',
        bullets: [
          'Filtrer par date',
          'Ouvrir un contrôle',
          'Suivre le statut'
        ]
      };
    case 'controls:detail':
      return {
        title: 'Détail contrôle',
        summary: 'Checklist, preuves et clôture.',
        bullets: [
          'Ajouter les preuves utiles',
          'Renseigner la note et le commentaire',
          'Clôturer quand tout est prêt'
        ]
      };
    case 'controls:plan':
      return {
        title: 'Planification',
        summary: 'Créer ou modifier un contrôle.',
        bullets: [
          'Choisir le site',
          'Définir date et heure',
          'Valider le planning'
        ]
      };
    case 'incidents:list':
      return {
        title: 'Incidents',
        summary: 'Suivi des non-conformités.',
        bullets: [
          'Filtrer par sévérité',
          'Ouvrir un incident',
          'Mettre à jour le statut'
        ]
      };
    case 'incidents:detail':
      return {
        title: 'Détail incident',
        summary: 'Contexte, responsable et statut.',
        bullets: [
          'Voir les informations clés',
          'Suivre l’avancement',
          'Mettre à jour si autorisé'
        ]
      };
    case 'incidents:edit':
      return {
        title: 'Création / édition incident',
        summary: 'Déclarer une non-conformité.',
        bullets: [
          'Choisir le site',
          'Définir la sévérité',
          'Valider la fiche'
        ]
      };
    case 'planning':
      return {
        title: 'Planning',
        summary: 'Agenda des contrôles.',
        bullets: [
          'Parcourir les jours',
          'Voir la charge',
          'Ajouter un contrôle'
        ]
      };
    case 'reports':
      return {
        title: 'Rapports',
        summary: 'Rapports clôturés et partage.',
        bullets: [
          'Ouvrir un rapport',
          'Partager le PDF',
          'Consulter la note'
        ]
      };
    case 'sites':
      return {
        title: 'Sites',
        summary: 'Référentiel des sites.',
        bullets: [
          'Voir les détails',
          'Créer ou modifier',
          'Régler le périmètre'
        ]
      };
    case 'templates':
      return {
        title: 'Listes de contrôle',
        summary: 'Modèles de checklist.',
        bullets: [
          'Créer un modèle',
          'Définir les critères',
          'Réorganiser la liste'
        ]
      };
    case 'profile':
      return {
        title: 'Profil',
        summary: 'Compte, apparence et données locales.',
        bullets: [
          'Changer l’apparence',
          'Consulter le rôle',
          'Réinitialiser les données'
        ]
      };
    case 'unknown':
      return null;
  }
}

export function AppBar({
  title,
  subtitle,
  right,
  left,
  className
}: {
  title: string;
  subtitle?: string;
  right?: Action[];
  left?: Action;
  className?: string;
}) {
  const pathname = usePathname();
  const { state } = useAppStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const [hideNextTime, setHideNextTime] = useState(false);
  const { colorScheme } = useColorScheme();
  const { width, height, fontScale } = useWindowDimensions();
  const resolvedScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const compact = width < 560;
  const tablet = width >= 768;
  const wide = width >= 1080;
  const showSidePanel = width >= 920;
  const titleSize = compact ? 28 : tablet ? 34 : 30;
  const subtitleSize = compact ? 13 : 14;
  const buttonSize = compact ? 44 : 46;
  const contentPaddingX = compact ? 18 : wide ? 28 : 22;
  const contentPaddingY = compact ? 18 : 22;
  const modalMaxWidth = Math.min(width - 24, wide ? 780 : 660);
  const modalMaxHeight = Math.max(320, height - (compact ? 20 : 40));
  const roleLabel = ROLE_LABELS[state.role];
  const pageTag = pageTagForPathname(pathname);
  const headerBackground = resolvedScheme === 'dark' ? '#081225' : '#EAF2FF';
  const headerBorderColor = resolvedScheme === 'dark' ? '#14213B' : '#D6E2FF';
  const headerShadowOpacity = resolvedScheme === 'dark' ? 0.22 : 0.06;

  const titleColor = resolvedScheme === 'dark' ? 'text-white' : 'text-slate-950';
  const subtitleColor = resolvedScheme === 'dark' ? 'text-white/78' : 'text-slate-700';
  const surfaceClassName = resolvedScheme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200';
  const mutedTextClassName = resolvedScheme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const primaryTextClassName = resolvedScheme === 'dark' ? 'text-white' : 'text-slate-950';

  const help = useMemo(() => helpContentForPathname(pathname, roleLabel), [pathname, roleLabel]);
  const heroSummary = help?.summary ?? 'Informations utiles de la page.';
  const quickBullets = help?.bullets.slice(0, showSidePanel ? 2 : 1) ?? [];
  const helpPreferenceKey = useMemo(
    () => (help ? preferenceKeyForRoute(pathname, state.session.userName) : null),
    [help, pathname, state.session.userName]
  );
  const rightActions = useMemo(() => {
    const base = right ?? [];
    if (!help) return base;
    if (base.some(a => a.label === 'Aide')) return base;
    return [...base, { icon: 'help-circle' as const, label: 'Aide', onPress: () => setHelpOpen(true) }];
  }, [right, help]);

  useEffect(() => {
    let cancelled = false;
    if (!help || !helpPreferenceKey) return;
    (async () => {
      try {
        const raw = await getItem(helpPreferenceKey);
        if (cancelled) return;
        const nextHidden = raw === '1';
        setHideNextTime(nextHidden);
        setHelpOpen(!nextHidden);
      } catch {
        if (cancelled) return;
        setHideNextTime(false);
        setHelpOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [help, helpPreferenceKey]);

  useEffect(() => {
    if (!helpOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [helpOpen]);

  const persistHidePreference = async (nextValue: boolean) => {
    setHideNextTime(nextValue);
    if (!helpPreferenceKey) return;
    try {
      await setItem(helpPreferenceKey, nextValue ? '1' : '0');
    } catch {}
  };

  const navGroupWidth = Math.max(buttonSize, rightActions.length * buttonSize + Math.max(0, rightActions.length - 1) * 8 + (rightActions.length > 0 ? 16 : 0));

  return (
    <>
      <View
        className={cn('border', resolvedScheme === 'dark' ? '' : 'border-white')}
        style={{
          backgroundColor: headerBackground,
          borderColor: headerBorderColor,
          borderRadius: wide ? 32 : 28,
          shadowColor: '#0F172A',
          shadowOpacity: headerShadowOpacity,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4
        }}
      >
        <View className={cn(className)} style={{ paddingHorizontal: contentPaddingX, paddingTop: contentPaddingY, paddingBottom: contentPaddingY, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: navGroupWidth, alignItems: 'flex-start', justifyContent: 'center' }}>
              {left ? <ActionButton action={left} showLabel={false} colorScheme={resolvedScheme} size={buttonSize} /> : <View style={{ width: buttonSize, height: buttonSize }} />}
            </View>

            <View style={{ flex: 1, minWidth: 0, alignItems: compact ? 'flex-start' : 'center' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: compact ? 'flex-start' : 'center' }}>
                <MetaPill label={pageTag} colorScheme={resolvedScheme} />
                <MetaPill label={roleLabel} colorScheme={resolvedScheme} tone="accent" />
              </View>
            </View>

            <View style={{ width: navGroupWidth, minHeight: buttonSize, alignItems: 'flex-end', justifyContent: 'center' }}>
              {rightActions.length > 0 ? (
                <View
                  className={cn('rounded-[20px] border p-2', resolvedScheme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-white/92 border-slate-200')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  {rightActions.map(action => (
                    <ActionButton
                      key={action.label}
                      action={action}
                      showLabel={false}
                      colorScheme={resolvedScheme}
                      size={buttonSize}
                      tone={action.label === 'Aide' ? 'primary' : 'default'}
                    />
                  ))}
                </View>
              ) : (
                <View style={{ width: buttonSize, height: buttonSize }} />
              )}
            </View>
          </View>

          <View style={{ flexDirection: showSidePanel ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                className={cn('font-extrabold', titleColor)}
                style={{ fontSize: titleSize, lineHeight: Math.round(titleSize * 1.08) }}
                maxFontSizeMultiplier={1.25}
                numberOfLines={compact ? 2 : 1}
              >
                {title}
              </Text>

              {subtitle ? (
                <Text
                  className={cn('mt-2', subtitleColor)}
                  style={{ fontSize: subtitleSize * Math.min(fontScale, 1.15), lineHeight: Math.round(subtitleSize * 1.5) }}
                  numberOfLines={compact ? 3 : 2}
                >
                  {subtitle}
                </Text>
              ) : null}

              <View style={{ flexDirection: compact ? 'column' : 'row', gap: 10, marginTop: 14 }}>
                <View
                  className={cn('flex-1 rounded-2xl border px-4 py-3', resolvedScheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}
                  style={{ gap: 4 }}
                >
                  <Text className={cn('text-[11px] font-semibold uppercase tracking-[0.45px]', mutedTextClassName)}>Repère</Text>
                  <Text className={cn('text-[14px] font-semibold leading-5', primaryTextClassName)}>
                    {quickBullets[0] ?? "Accède à l'essentiel."}
                  </Text>
                </View>

                <View
                  className={cn('flex-1 rounded-2xl border px-4 py-3', resolvedScheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}
                  style={{ gap: 4 }}
                >
                  <Text className={cn('text-[11px] font-semibold uppercase tracking-[0.45px]', mutedTextClassName)}>Action</Text>
                  <Text className={cn('text-[14px] font-semibold leading-5', primaryTextClassName)}>
                    {help ? "Ouvre l'aide si besoin." : 'Actions visibles et directes.'}
                  </Text>
                </View>
              </View>
            </View>

            {showSidePanel ? (
              <View
                className={cn('rounded-[24px] border px-5 py-4', resolvedScheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200')}
                style={{ width: wide ? 290 : 260, gap: 10 }}
              >
                <Text className={cn('text-[11px] font-semibold uppercase tracking-[0.5px]', mutedTextClassName)}>En bref</Text>
                <Text className={cn('text-[14px] leading-6', primaryTextClassName)}>{heroSummary}</Text>
                {quickBullets.slice(0, 2).map(item => (
                  <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View className="mt-1 h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                      <Icon name="check" size={12} color="#FFFFFF" strokeWidth={2.6} />
                    </View>
                    <Text className={cn('flex-1 text-[13px] leading-5', mutedTextClassName)}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {!showSidePanel ? (
            <View className={cn('rounded-2xl border px-4 py-3', resolvedScheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}>
              <View style={{ flexDirection: 'row', alignItems: compact ? 'flex-start' : 'center', gap: 12 }}>
                <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: '#22C55E', marginTop: compact ? 5 : 0 }} />
                <Text className={cn('flex-1 font-medium', resolvedScheme === 'dark' ? 'text-white/88' : 'text-slate-800')} style={{ fontSize: 13 * Math.min(fontScale, 1.1), lineHeight: 18 }}>
                  {heroSummary}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <Modal visible={Boolean(help) && helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la presentation de la page"
          accessibilityHint="Ferme la fenetre d'aide en cliquant sur le fond"
          onPress={() => setHelpOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.68)', justifyContent: compact ? 'flex-end' : 'center', padding: 12 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: modalMaxWidth }}>
              <View
                accessibilityViewIsModal
                className={cn('rounded-[30px] border p-5', surfaceClassName)}
                style={{
                  maxHeight: modalMaxHeight,
                  shadowColor: '#020617',
                  shadowOpacity: resolvedScheme === 'dark' ? 0.42 : 0.14,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 10,
                  gap: 18
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                  <View className={cn('h-14 w-14 items-center justify-center rounded-[20px]', resolvedScheme === 'dark' ? 'bg-brand-500/16' : 'bg-brand-50')}>
                    <Icon name="help-circle" size={24} color={resolvedScheme === 'dark' ? '#BFDBFE' : '#1D4ED8'} strokeWidth={2.4} />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <MetaPill label="Presentation" colorScheme={resolvedScheme} tone="accent" />
                      <MetaPill label={roleLabel} colorScheme={resolvedScheme} />
                    </View>
                    <Text className={cn('mt-3 text-[24px] font-extrabold', primaryTextClassName)} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                      {help?.title ?? 'Aide'}
                    </Text>
                    <Text className={cn('mt-2 text-[14px] leading-5', mutedTextClassName)} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                      {help?.summary ?? ''}
                    </Text>
                  </View>

                  <ActionButton
                    action={{ icon: 'x', label: 'Fermer', onPress: () => setHelpOpen(false) }}
                    showLabel={false}
                    colorScheme={resolvedScheme}
                    size={buttonSize}
                  />
                </View>

                <View className={cn('rounded-[24px] border p-4', resolvedScheme === 'dark' ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100')} style={{ flexShrink: 1 }}>
                  <Text className={cn('text-[13px] font-semibold uppercase tracking-[0.45px]', mutedTextClassName)}>Essentiel</Text>
                  <ScrollView style={{ maxHeight: compact ? 180 : 220, marginTop: 12 }} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                    {(help?.bullets ?? []).map((item, index) => (
                      <HelpBullet key={`${index}-${item}`} index={index} text={item} colorScheme={resolvedScheme} />
                    ))}
                  </ScrollView>
                </View>

                <View className={cn('rounded-[24px] border p-4', resolvedScheme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200')} style={{ gap: 12 }}>
                  <View>
                    <Text className={cn('text-[15px] font-semibold', primaryTextClassName)}>Affichage automatique</Text>
                    <Text className={cn('mt-1 text-[13px] leading-5', mutedTextClassName)} numberOfLines={2}>
                      Choisis si tu veux revoir cette présentation.
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Ne plus afficher cette presentation automatiquement"
                    accessibilityHint="Enregistre votre preference dans le stockage local pour les prochaines visites"
                    accessibilityState={{ checked: hideNextTime }}
                    focusable
                    onPress={() => void persistHidePreference(!hideNextTime)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.92 : 1,
                      borderWidth: 1,
                      borderRadius: 18,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderColor: resolvedScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                      backgroundColor: resolvedScheme === 'dark' ? 'rgba(255,255,255,0.04)' : '#FFFFFF'
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View className={cn('h-11 w-11 items-center justify-center rounded-2xl', hideNextTime ? 'bg-brand-600' : resolvedScheme === 'dark' ? 'bg-white/10' : 'bg-slate-100')}>
                        <Icon name={hideNextTime ? 'check' : 'eye-off'} size={18} color={hideNextTime ? '#FFFFFF' : resolvedScheme === 'dark' ? '#FFFFFF' : '#475569'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className={cn('text-[14px] font-semibold', primaryTextClassName)}>Ne plus afficher automatiquement</Text>
                      </View>
                    </View>
                  </Pressable>

                  <View className={cn('rounded-2xl border px-4 py-3', resolvedScheme === 'dark' ? 'bg-white/5 border-white/8' : 'bg-white border-slate-200')}>
                    <Text className={cn('text-[13px] font-semibold', primaryTextClassName)}>Acces adapte au role</Text>
                    <Text className={cn('mt-1 text-[13px] leading-5', mutedTextClassName)} numberOfLines={2}>
                      Certaines actions changent selon ton rôle ({roleLabel}).
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: compact ? 'column' : 'row', gap: 10 }}>
                  <ActionButton
                    action={{ icon: 'check', label: 'Compris', onPress: () => setHelpOpen(false) }}
                    showLabel
                    colorScheme={resolvedScheme}
                    size={buttonSize}
                    tone="primary"
                    stretch
                    onPress={() => setHelpOpen(false)}
                  />
                  <ActionButton
                    action={{ icon: 'x', label: 'Fermer', onPress: () => setHelpOpen(false) }}
                    showLabel
                    colorScheme={resolvedScheme}
                    size={buttonSize}
                    stretch
                    onPress={() => setHelpOpen(false)}
                  />
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
