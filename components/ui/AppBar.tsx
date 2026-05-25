import { usePathname } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { cn } from '../../lib/cn';
import { ROLE_LABELS, routeKeyForPathname } from '../../lib/models';
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

function normalizeUserScope(userName: string) {
  const clean = userName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 48);
  return clean || 'anonymous';
}

function preferenceKeyForRoute(pathname: string, userName: string) {
  const routeKey = routeKeyForPathname(pathname);
  if (routeKey === 'unknown') return null;
  return `${HELP_PREFERENCE_PREFIX}:${normalizeUserScope(userName)}:${routeKey}`;
}

function ActionButton({
  action,
  showLabel,
  colorScheme,
  size,
  onPress
}: {
  action: Action;
  showLabel: boolean;
  colorScheme: 'light' | 'dark';
  size: number;
  onPress?: () => void;
}) {
  const isDark = colorScheme === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={showLabel ? undefined : `${action.label}. Active cette action depuis l’en-tête.`}
      focusable
      onPress={onPress ?? action.onPress}
      style={({ pressed }) => ({
        minHeight: size,
        minWidth: showLabel ? size + 28 : size,
        width: showLabel ? undefined : size,
        paddingHorizontal: showLabel ? 14 : 0,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.92 : 1,
        borderWidth: 1,
        borderColor: isDark ? '#22314A' : '#D6E2FF',
        backgroundColor: isDark ? '#0F1A2E' : '#FFFFFF'
      })}
      className="rounded-2xl items-center justify-center"
    >
      <View className="flex-row items-center justify-center">
        <Icon name={action.icon} size={showLabel ? 18 : 20} color={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={2.3} />
        {showLabel ? (
          <Text className={cn('ml-2 text-[13px] font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{action.label}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function helpContentForPathname(pathname: string, roleLabel: string): HelpContent | null {
  const key = routeKeyForPathname(pathname);
  switch (key) {
    case 'home':
      return {
        title: 'Accueil',
        summary: `Vue d’ensemble de ta journée et des raccourcis utiles. Rôle actuel : ${roleLabel}.`,
        bullets: [
          'Voir rapidement les contrôles du jour et les incidents actifs',
          'Accéder au planning pour préparer la tournée',
          'Ouvrir les rapports générés et les partager (mobile)',
          'Aller vers les modules principaux via la barre du bas'
        ]
      };
    case 'controls:list':
      return {
        title: 'Contrôles',
        summary: 'Liste des contrôles planifiés pour une date, avec statut et accès au détail.',
        bullets: [
          'Changer la date pour filtrer les contrôles planifiés',
          'Ouvrir un contrôle pour consulter ou réaliser la checklist',
          'Suivre le statut (Planifié / En cours / Terminé)',
          'Générer un rapport après clôture (selon le rôle)'
        ]
      };
    case 'controls:detail':
      return {
        title: 'Détail contrôle',
        summary: 'Réalisation terrain : checklist, note, commentaires et preuves (selon le rôle).',
        bullets: [
          'Vérifier la présence (GPS / réseau / QR) puis capturer des photos',
          'Cocher les critères, mettre une note, ajouter un commentaire',
          'Clôturer quand tout est conforme (blocages si preuves manquantes)',
          'Consulter les photos avant/après et les certifications'
        ]
      };
    case 'controls:plan':
      return {
        title: 'Planification',
        summary: 'Création / modification d’un contrôle : site, date/heure, durée et type.',
        bullets: [
          'Choisir un site avec recherche',
          'Définir date/heure et durée (raccourcis rapides)',
          'Sélectionner le type (Qualité / Avant-Après)',
          'Valider pour ajouter au planning'
        ]
      };
    case 'incidents:list':
      return {
        title: 'Incidents',
        summary: 'Suivi des non-conformités : filtre par sévérité et accès au détail.',
        bullets: [
          'Filtrer par criticité (Critique / Majeure / Mineure)',
          'Ouvrir un incident pour voir les détails et l’état',
          'Créer un incident terrain si ton rôle le permet',
          'Mettre à jour le statut dans le workflow (selon le rôle)'
        ]
      };
    case 'incidents:detail':
      return {
        title: 'Détail incident',
        summary: 'Fiche d’incident : contexte, description, attribution et statut.',
        bullets: [
          'Consulter le site, la sévérité et le contenu de la fiche',
          'Suivre l’avancement (ouvert / en cours / clos)',
          'Éditer ou clôturer selon le rôle',
          'Garder une traçabilité claire des actions'
        ]
      };
    case 'incidents:edit':
      return {
        title: 'Création / édition incident',
        summary: 'Déclaration terrain : dates, description, sévérité, échéance et attribution.',
        bullets: [
          'Sélectionner le site concerné',
          'Définir la sévérité et le contexte (date/heure)',
          'Ajouter une échéance et un responsable si nécessaire',
          'Valider pour publier dans la liste'
        ]
      };
    case 'planning':
      return {
        title: 'Planning',
        summary: 'Vue agenda multi-jours pour organiser les contrôles et la tournée.',
        bullets: [
          'Naviguer sur une fenêtre de 5 jours',
          'Voir le volume de contrôles par jour',
          'Préparer les déplacements et la charge',
          'Créer des contrôles si ton rôle le permet'
        ]
      };
    case 'reports':
      return {
        title: 'Rapports',
        summary: 'Historique des contrôles clôturés avec export PDF (mobile) et partage.',
        bullets: [
          'Ouvrir un rapport généré après clôture',
          'Partager un PDF sur mobile',
          'Vérifier certifications, checklist et note',
          'Supprimer un rapport du cache local (selon le rôle)'
        ]
      };
    case 'sites':
      return {
        title: 'Sites',
        summary: 'Référentiel des sites : adresse, tags et géofence (accès limité par rôle).',
        bullets: [
          'Consulter la liste et les détails d’un site',
          'Créer ou modifier un site si autorisé',
          'Régler le rayon de géofence pour les contrôles',
          'Gérer les tags pour filtrer rapidement'
        ]
      };
    case 'templates':
      return {
        title: 'Listes de contrôle',
        summary: 'Modèles de checklist avec critères critiques, édition et réorganisation (accès limité).',
        bullets: [
          'Créer un modèle par typologie de site',
          'Marquer les critères critiques pour les blocages de clôture',
          'Réordonner pour suivre le parcours terrain',
          'Mettre à jour pour standardiser la qualité'
        ]
      };
    case 'profile':
      return {
        title: 'Profil',
        summary: 'Compte local, apparence, rôle et gestion du cache.',
        bullets: [
          'Changer le mode d’affichage (Système / Clair / Sombre)',
          'Consulter ton rôle et ses accès',
          'Voir des stats simples de démonstration',
          'Réinitialiser ou vider le cache local'
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
  const { width, fontScale } = useWindowDimensions();
  const resolvedScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const compact = width < 560;
  const wide = width >= 900;
  const showActionLabels = width >= 720;
  const titleSize = compact ? 22 : wide ? 30 : 26;
  const subtitleSize = compact ? 13 : 14;
  const buttonSize = compact ? 44 : 48;
  const contentPaddingX = compact ? 18 : wide ? 28 : 22;
  const contentPaddingY = compact ? 18 : 20;
  const modalMaxWidth = Math.min(width - 24, wide ? 760 : 640);
  const roleLabel = ROLE_LABELS[state.role];
  const headerBackground = resolvedScheme === 'dark' ? '#081225' : '#EAF2FF';
  const headerBorderColor = resolvedScheme === 'dark' ? '#14213B' : '#D6E2FF';
  const headerShadowOpacity = resolvedScheme === 'dark' ? 0.22 : 0.06;

  const titleColor = resolvedScheme === 'dark' ? 'text-white' : 'text-slate-950';
  const subtitleColor = resolvedScheme === 'dark' ? 'text-white/78' : 'text-slate-700';
  const surfaceClassName = resolvedScheme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200';
  const mutedTextClassName = resolvedScheme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const primaryTextClassName = resolvedScheme === 'dark' ? 'text-white' : 'text-slate-950';

  const help = useMemo(() => helpContentForPathname(pathname, roleLabel), [pathname, roleLabel]);
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
        <View
          className={cn(className)}
          style={{
            paddingHorizontal: contentPaddingX,
            paddingTop: contentPaddingY,
            paddingBottom: contentPaddingY - 2,
            gap: compact ? 14 : 18
          }}
        >
          <View
            style={{
              flexDirection: compact ? 'column' : 'row',
              alignItems: compact ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: compact ? 14 : 18
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
              {left ? (
                <View style={{ marginRight: 12 }}>
                  <ActionButton action={left} showLabel={false} colorScheme={resolvedScheme} size={buttonSize} />
                </View>
              ) : null}
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <View
                  className={cn(
                    'self-start rounded-full px-3 py-1',
                    resolvedScheme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
                  )}
                >
                  <Text className={cn('text-[11px] font-semibold tracking-[0.3px]', resolvedScheme === 'dark' ? 'text-white/90' : 'text-brand-800')}>
                    {roleLabel}
                  </Text>
                </View>
                <Text
                  className={cn('mt-3 font-extrabold', titleColor)}
                  style={{ fontSize: titleSize, lineHeight: Math.round(titleSize * 1.12) }}
                  maxFontSizeMultiplier={1.25}
                  numberOfLines={compact ? 2 : 1}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    className={cn('mt-1', subtitleColor)}
                    style={{ fontSize: subtitleSize * Math.min(fontScale, 1.15), lineHeight: Math.round(subtitleSize * 1.45) }}
                    numberOfLines={compact ? 3 : 2}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            {rightActions.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  width: compact ? '100%' : undefined,
                  justifyContent: compact ? 'flex-start' : 'flex-end',
                  alignSelf: compact ? 'stretch' : 'auto'
                }}
              >
                {rightActions.map(a => (
                  <ActionButton
                    key={a.label}
                    action={a}
                    showLabel={showActionLabels}
                    colorScheme={resolvedScheme}
                    size={buttonSize}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View
            className={cn(
              'rounded-2xl border px-4 py-3',
              resolvedScheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            )}
          >
            <View style={{ flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'flex-start' : 'center', gap: compact ? 8 : 14 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: '#22C55E',
                  marginTop: compact ? 4 : 0
                }}
              />
              <Text
                className={cn('font-medium', resolvedScheme === 'dark' ? 'text-white/88' : 'text-slate-800')}
                style={{ fontSize: 13 * Math.min(fontScale, 1.15), lineHeight: 19 }}
              >
                Navigation claire, contrastée et adaptée aux rôles. Les actions de page restent accessibles via l’aide contextuelle.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Modal visible={Boolean(help) && helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la présentation de la page"
          accessibilityHint="Ferme la fenêtre d’aide en cliquant sur le fond"
          onPress={() => setHelpOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.62)', justifyContent: compact ? 'flex-end' : 'center', padding: 12 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: modalMaxWidth }}>
              <View
                className={cn(
                  'rounded-[28px] border p-5',
                  surfaceClassName
                )}
                style={{
                  shadowColor: '#020617',
                  shadowOpacity: resolvedScheme === 'dark' ? 0.4 : 0.14,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 10
                }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <View
                      className={cn(
                        'self-start rounded-full px-3 py-1',
                        resolvedScheme === 'dark' ? 'bg-brand-500/20 border border-brand-400/20' : 'bg-brand-50 border border-brand-100'
                      )}
                    >
                      <Text className="text-[11px] font-semibold text-brand-700 dark:text-brand-200">Présentation de la page</Text>
                    </View>
                    <Text
                      className={cn('mt-3 text-[22px] font-extrabold', primaryTextClassName)}
                      accessibilityRole="header"
                      maxFontSizeMultiplier={1.2}
                    >
                      {help?.title ?? 'Aide'}
                    </Text>
                    <Text className={cn('mt-2 text-[14px] leading-6', mutedTextClassName)} maxFontSizeMultiplier={1.2}>
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

                <ScrollView style={{ maxHeight: compact ? 300 : 340 }} contentContainerStyle={{ paddingTop: 18, paddingBottom: 8 }}>
                  {(help?.bullets ?? []).map((b, idx) => (
                    <View
                      key={`${idx}-${b}`}
                      className={cn(
                        'mb-3 flex-row items-start rounded-2xl border px-4 py-3',
                        resolvedScheme === 'dark' ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
                      )}
                    >
                      <View className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-brand-600">
                        <Icon name="check" size={14} color="#FFFFFF" strokeWidth={2.6} />
                      </View>
                      <Text className={cn('flex-1 text-[14px] leading-6', resolvedScheme === 'dark' ? 'text-slate-100' : 'text-slate-800')}>
                        {b}
                      </Text>
                    </View>
                  ))}

                  <View
                    className={cn(
                      'mt-2 rounded-2xl border p-4',
                      resolvedScheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <Text className={cn('text-[13px] font-semibold', primaryTextClassName)}>
                      Accès par rôle
                    </Text>
                    <Text className={cn('mt-1 text-[13px] leading-5', mutedTextClassName)}>
                      Certaines actions sont masquées ou désactivées selon ton rôle ({roleLabel}).
                    </Text>
                  </View>
                </ScrollView>

                <View
                  className={cn(
                    'mt-4 rounded-2xl border p-4',
                    resolvedScheme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'
                  )}
                  style={{ gap: 12 }}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Ne plus afficher cette présentation automatiquement"
                    accessibilityHint="Enregistre votre préférence dans le stockage local pour les prochaines visites"
                    accessibilityState={{ checked: hideNextTime }}
                    focusable
                    onPress={() => void persistHidePreference(!hideNextTime)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.9 : 1,
                      borderWidth: 1,
                      borderColor: resolvedScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                      backgroundColor: resolvedScheme === 'dark' ? 'rgba(255,255,255,0.04)' : '#FFFFFF'
                    })}
                    className="rounded-2xl px-4 py-3"
                  >
                    <View className="flex-row items-center">
                      <View
                        className={cn(
                          'h-10 w-10 items-center justify-center rounded-2xl',
                          hideNextTime ? 'bg-rose-600' : resolvedScheme === 'dark' ? 'bg-white/10' : 'bg-slate-100'
                        )}
                      >
                        <Icon
                          name={hideNextTime ? 'check' : 'eye-off'}
                          size={18}
                          color={hideNextTime ? '#FFFFFF' : resolvedScheme === 'dark' ? '#FFFFFF' : '#475569'}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className={cn('text-[14px] font-semibold', primaryTextClassName)}>
                          Ne plus afficher automatiquement
                        </Text>
                        <Text className={cn('mt-1 text-[12px] leading-5', mutedTextClassName)}>
                          Préférence conservée dans le stockage local pour cette page et cet utilisateur.
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  <View style={{ flexDirection: compact ? 'column' : 'row', gap: 10 }}>
                    <ActionButton
                      action={{
                        icon: hideNextTime ? 'check' : 'help-circle',
                        label: hideNextTime ? 'Préférence enregistrée' : 'Continuer',
                        onPress: () => setHelpOpen(false)
                      }}
                      showLabel
                      colorScheme={resolvedScheme}
                      size={buttonSize}
                      onPress={() => setHelpOpen(false)}
                    />
                    <ActionButton
                      action={{
                        icon: 'x',
                        label: 'Fermer',
                        onPress: () => setHelpOpen(false)
                      }}
                      showLabel
                      colorScheme={resolvedScheme}
                      size={buttonSize}
                      onPress={() => setHelpOpen(false)}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
