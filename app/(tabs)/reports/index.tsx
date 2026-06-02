import { useRouter } from 'expo-router';
import { Alert, Platform, Text, View } from 'react-native';

import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { ListScreen } from '../../../components/ui/ListScreen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { canAccessPathname, canPerform } from '../../../lib/models';
import { routes } from '../../../lib/routes';
import { useAppStore } from '../../../lib/store';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function ReportsScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const completed = state.inspections.filter(i => Boolean(i.completedAt));

  const Print: any = Platform.OS === 'web' ? null : require('expo-print');
  const Sharing: any = Platform.OS === 'web' ? null : require('expo-sharing');
  const FileSystem: any = Platform.OS === 'web' ? null : require('expo-file-system');

  const exportPdf = async (inspectionId: string) => {
    const rep = state.inspections.find(i => i.id === inspectionId);
    if (!rep) return;
    const control = state.plannedControls.find(c => c.id === rep.plannedControlId);
    const site = control ? state.sites.find(s => s.id === control.siteId) : undefined;
    const template = state.templates.find(t => t.id === rep.templateId) ?? state.templates[0];

    if (Platform.OS === 'web') {
      Alert.alert('Partage', 'Le partage PDF est disponible sur mobile.');
      return;
    }
    if (!Print?.printToFileAsync || !Sharing?.shareAsync) return;

    const toDataUri = async (uri: string) => {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        return `data:image/jpeg;base64,${base64}`;
      } catch {
        return null;
      }
    };

    const checkedCount = Object.values(rep.checklist).filter(Boolean).length;
    const totalCount = Object.keys(rep.checklist).length;
    const critOk = template ? template.items.filter(it => it.critical).every(it => rep.checklist[it.id]) : false;
    const beforeCount = rep.photos.filter(p => p.kind === 'before').length;
    const afterCount = rep.photos.filter(p => p.kind === 'after').length;
    const photosForPdf = rep.photos.slice(0, 6);
    const photoData = (await Promise.all(photosForPdf.map(async p => ({ p, dataUri: await toDataUri(p.uri) })))).filter(x => Boolean(x.dataUri));

    const att = rep.attachments ?? [];
    const attPhotos = att.filter(a => a.mediaType !== 'video').slice(0, 6);
    const attVideos = att.filter(a => a.mediaType === 'video').slice(0, 6);
    const attPhotoData = (await Promise.all(attPhotos.map(async a => ({ a, dataUri: await toDataUri(a.uri) })))).filter(x => Boolean(x.dataUri));

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 18px; color: #0f172a; }
            h1 { margin: 0 0 6px 0; font-size: 20px; }
            h2 { margin: 18px 0 8px 0; font-size: 14px; color: #334155; }
            .muted { color: #64748b; font-size: 12px; }
            .row { display: flex; gap: 10px; flex-wrap: wrap; }
            .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #f1f5f9; font-size: 12px; }
            .ok { background: #dcfce7; }
            .warn { background: #ffedd5; }
            .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            ul { padding-left: 18px; margin: 6px 0; }
            .grid { display: flex; flex-wrap: wrap; gap: 10px; }
            .ph { width: calc(50% - 5px); border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; position: relative; }
            .ph img { width: 100%; height: auto; display: block; }
            .wm { position: absolute; right: 10px; bottom: 10px; background: rgba(0,0,0,0.45); color: #fff; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 900; }
            .dt { position: absolute; left: 10px; top: 10px; background: rgba(0,0,0,0.45); color: #fff; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; }
          </style>
        </head>
        <body>
          <h1>Rapport de contrôle</h1>
          <div class="muted">${escapeHtml(site?.name ?? 'Site')} • ${escapeHtml(control?.date ?? '')} • ${escapeHtml(rep.completedAt?.slice(0, 16).replace('T', ' ') ?? '')}</div>
          <div class="row" style="margin-top: 12px;">
            <span class="pill ${rep.rating >= 4 ? 'ok' : 'warn'}">Note: ${rep.rating}/5</span>
            <span class="pill">Checklist: ${checkedCount}/${totalCount}</span>
            <span class="pill ${critOk ? 'ok' : 'warn'}">Critiques: ${critOk ? 'OK' : 'KO'}</span>
            <span class="pill">${escapeHtml(control?.type === 'beforeAfter' ? `Photos: avant ${beforeCount} / après ${afterCount}` : `Photos: ${rep.photos.length}`)}</span>
          </div>

          <h2>Certifications</h2>
          <div class="box">
            <div class="row">
              <span class="pill ${rep.certifications.gpsVerified ? 'ok' : 'warn'}">GPS: ${rep.certifications.gpsVerified ? 'OK' : 'KO'}</span>
              <span class="pill ${rep.certifications.networkVerified ? 'ok' : 'warn'}">Réseau: ${rep.certifications.networkVerified ? 'OK' : 'KO'}</span>
              <span class="pill ${rep.certifications.qrScanned ? 'ok' : 'warn'}">QR: ${rep.certifications.qrScanned ? 'OK' : 'KO'}</span>
              <span class="pill ${rep.certifications.photoCertified ? 'ok' : 'warn'}">Photos: ${rep.certifications.photoCertified ? 'certifiées' : 'non certifiées'}</span>
            </div>
            <div class="muted" style="margin-top: 8px;">
              Distance: ${rep.certifications.lastDistanceMeters ?? '—'} m • Réseau: ${escapeHtml(rep.certifications.lastNetworkType ?? '—')}
            </div>
          </div>

          <h2>Checklist</h2>
          <div class="box">
            <div class="muted">${escapeHtml(template?.name ?? 'Liste de contrôle')}</div>
            <ul>
              ${(template?.items ?? [])
                .map(it => {
                  const ok = Boolean(rep.checklist[it.id]);
                  return `<li>${escapeHtml(it.label)} — ${ok ? 'OK' : 'KO'}${it.critical ? ' (critique)' : ''}</li>`;
                })
                .join('')}
            </ul>
          </div>

          <h2>Commentaire</h2>
          <div class="box">
            <div>${escapeHtml(rep.notes || '—')}</div>
          </div>

          <h2>Preuves photo (filigrane)</h2>
          <div class="box">
            ${
              photoData.length > 0
                ? `<div class="grid">${photoData
                    .map(({ p, dataUri }) => {
                      const stamp = String(p.capturedAt ?? '').slice(0, 16).replace('T', ' ');
                      const label = control?.type === 'beforeAfter' ? (p.kind === 'before' ? 'Avant' : 'Après') : 'Preuve';
                      return `<div class="ph">
                        <img src="${dataUri}" />
                        <div class="dt">${escapeHtml(stamp)}</div>
                        <div class="wm">Puissance 5</div>
                        <div class="muted" style="padding: 8px 10px;">${escapeHtml(label)}</div>
                      </div>`;
                    })
                    .join('')}</div>`
                : `<div class="muted">Aucune photo exportable.</div>`
            }
            <div class="muted" style="margin-top: 10px;">Les photos incluent la date et le filigrane “Puissance 5” dans le PDF.</div>
          </div>

          <h2>Preuves checklist</h2>
          <div class="box">
            ${
              attPhotoData.length > 0
                ? `<div class="grid">${attPhotoData
                    .map(({ a, dataUri }) => {
                      const stamp = String(a.capturedAt ?? '').slice(0, 16).replace('T', ' ');
                      const label = template?.items?.find(it => it.id === a.itemId)?.label ?? 'Critère';
                      return `<div class="ph">
                        <img src="${dataUri}" />
                        <div class="dt">${escapeHtml(stamp)}</div>
                        <div class="wm">${escapeHtml(a.watermarkText ?? 'Puissance 5')}</div>
                        <div class="muted" style="padding: 8px 10px;">${escapeHtml(label)}</div>
                      </div>`;
                    })
                    .join('')}</div>`
                : `<div class="muted">Aucune photo par critère.</div>`
            }
            ${
              attVideos.length > 0
                ? `<div class="muted" style="margin-top: 10px;">Vidéos (${attVideos.length}): ${attVideos
                    .map(v => escapeHtml(String(v.capturedAt ?? '').slice(0, 16).replace('T', ' ')))
                    .join(' • ')}</div>`
                : ``
            }
          </div>
        </body>
      </html>
    `;

    const file = await Print.printToFileAsync({ html, base64: false });
    if (!file?.uri) return;
    await Sharing.shareAsync(file.uri);
  };

  const showHomeShortcut = canAccessPathname(state.role, routes.home);

  return (
    <ListScreen
      data={completed}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
          <AppBar
            title="Rapports"
            subtitle={`Historique • ${completed.length} généré${completed.length > 1 ? 's' : ''} • export PDF`}
            left={showHomeShortcut ? { icon: 'house', label: 'Accueil', onPress: () => router.replace(routes.home) } : undefined}
          />

          <SectionHeader title="Derniers rapports" />
        </>
      }
      ListEmptyComponent={
        <Card>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Aucun rapport généré</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Clôture un contrôle pour retrouver son rapport ici.</Text>
        </Card>
      }
      ListFooterComponent={
        <>
          <SectionHeader title="Partage client" />
          <Card>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Lien web sécurisé</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
              Un espace partagé peut être ajouté ici pour permettre la consultation des rapports par les clients et responsables.
            </Text>
          </Card>
        </>
      }
      renderItem={({ item: rep }) => {
        const control = state.plannedControls.find(c => c.id === rep.plannedControlId);
        const site = control ? state.sites.find(s => s.id === control.siteId) : undefined;
        return (
          <View className="mb-3">
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                  <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                    Note {rep.rating}/5 • {rep.completedAt?.slice(0, 10)}
                  </Text>
                </View>
                <Chip label="PDF" tone="neutral" />
              </View>
              <View className="mt-4 gap-3">
                <Button label="Partager PDF" variant="secondary" onPress={() => exportPdf(rep.id)} />
                {canPerform(state.role, 'delete_reports') ? (
                  <Button
                    label="Supprimer"
                    variant="danger"
                    onPress={() =>
                      Alert.alert('Supprimer', 'Supprimer ce rapport ?', [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteInspection', inspectionId: rep.id }) }
                      ])
                    }
                  />
                ) : null}
              </View>
            </Card>
          </View>
        );
      }}
    />
  );
}
