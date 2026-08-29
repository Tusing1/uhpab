import { toast } from 'sonner';

export const sanitizeFileName = (name: string) =>
  name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'download';

type DownloadOptions = {
  notify?: boolean;
  message?: string;
};

const DOWNLOAD_BACKUP_ID = 'uhpab-download-backup';

const showDownloadBackup = (url: string, fileName: string) => {
  const existing = document.getElementById(DOWNLOAD_BACKUP_ID);
  existing?.remove();

  const panel = document.createElement('div');
  panel.id = DOWNLOAD_BACKUP_ID;
  panel.setAttribute('role', 'status');
  panel.style.position = 'fixed';
  panel.style.right = '18px';
  panel.style.bottom = '18px';
  panel.style.zIndex = '9999';
  panel.style.maxWidth = '360px';
  panel.style.padding = '14px';
  panel.style.border = '1px solid #bfdbfe';
  panel.style.borderRadius = '10px';
  panel.style.background = '#ffffff';
  panel.style.boxShadow = '0 20px 45px rgba(15, 23, 42, 0.18)';
  panel.style.color = '#0f172a';
  panel.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  const title = document.createElement('p');
  title.textContent = 'Download ready';
  title.style.margin = '0 0 4px';
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';

  const detail = document.createElement('p');
  detail.textContent = 'If it did not save automatically, use the backup link below.';
  detail.style.margin = '0 0 10px';
  detail.style.fontSize = '12px';
  detail.style.lineHeight = '1.5';
  detail.style.color = '#475569';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.alignItems = 'center';
  actions.style.flexWrap = 'wrap';

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.textContent = 'Save file';
  link.style.display = 'inline-flex';
  link.style.alignItems = 'center';
  link.style.minHeight = '34px';
  link.style.padding = '0 12px';
  link.style.borderRadius = '8px';
  link.style.background = '#0f766e';
  link.style.color = '#ffffff';
  link.style.fontWeight = '700';
  link.style.fontSize = '13px';
  link.style.textDecoration = 'none';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.style.minHeight = '34px';
  close.style.padding = '0 10px';
  close.style.border = '1px solid #cbd5e1';
  close.style.borderRadius = '8px';
  close.style.background = '#ffffff';
  close.style.color = '#334155';
  close.style.cursor = 'pointer';
  close.onclick = () => panel.remove();

  actions.append(link, close);
  panel.append(title, detail, actions);
  document.body.appendChild(panel);
};

const createBackupUrl = async (url: string) => {
  if (!url.startsWith('blob:')) return { url, revoke: false };

  try {
    const blob = await fetch(url).then((response) => response.blob());
    return { url: URL.createObjectURL(blob), revoke: true };
  } catch {
    return { url, revoke: false };
  }
};

export const triggerBrowserDownload = (
  url: string,
  fileName: string,
  { notify = true, message = 'Download started' }: DownloadOptions = {}
) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  createBackupUrl(url).then(({ url: backupUrl, revoke }) => {
    showDownloadBackup(backupUrl, fileName);
    if (revoke) {
      window.setTimeout(() => URL.revokeObjectURL(backupUrl), 5 * 60 * 1000);
    }
  });

  if (notify) {
    toast.success(message, {
      description: `${fileName} is being saved. A backup link is shown on this page.`,
      duration: 6500,
    });
  }

  window.setTimeout(() => {
    link.remove();
  }, 3000);
};
