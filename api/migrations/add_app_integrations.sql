-- ============================================================================
-- Migration : catalogue des applications mises à disposition des agents
-- Contexte  : la page admin Paramètres gère les intégrations (Gmail, Agenda…) :
--             activation/désactivation pour les utilisateurs, taux
--             d'association, suppression. Les connexions elles-mêmes restent
--             dans user_connections (connection_id = id du catalogue).
-- Exécution : manuelle (psql) — additive et sans risque.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_integrations (
  id          TEXT PRIMARY KEY,          -- = user_connections.connection_id
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  logo_url    TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_integrations (id, name, description, category, logo_url) VALUES
  ('gmail',     'Gmail',            'Lecture, envoi et tri des emails par l''agent Email',            'Emails',      'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'),
  ('calendar',  'Google Agenda',    'Création et gestion des rendez-vous par l''agent Calendrier',    'Calendrier',  'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64'),
  ('contacts',  'Google Contacts',  'Synchronisation du carnet d''adresses par l''agent Contacts',    'Contacts',    'https://www.google.com/s2/favicons?domain=contacts.google.com&sz=64'),
  ('drive',     'Google Drive',     'Accès aux documents pour la base de connaissance',               'Documents',   'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64'),
  ('notion',    'Notion',           'Pages et bases Notion pour la base de connaissance',             'Documents',   'https://www.google.com/s2/favicons?domain=notion.so&sz=64'),
  ('airtable',  'Airtable',         'Tables financières utilisées par l''agent Finance',              'Finance',     'https://www.google.com/s2/favicons?domain=airtable.com&sz=64'),
  ('hubspot',   'HubSpot',          'CRM externe synchronisé avec l''agent Contacts',                 'CRM',         'https://www.google.com/s2/favicons?domain=hubspot.com&sz=64'),
  ('office365', 'Microsoft 365',    'Emails et agenda Outlook (alternative à Google)',                'Emails',      'https://www.google.com/s2/favicons?domain=office.com&sz=64')
ON CONFLICT (id) DO NOTHING;

-- Complément (18/07/2026) : alignement des ids sur le frontend + catalogue complet
UPDATE public.app_integrations SET id = 'googledrive' WHERE id = 'drive';

INSERT INTO public.app_integrations (id, name, description, category, logo_url) VALUES
  ('trello',     'Trello',       'Tableaux de gestion de projets',     'Productivité',  'https://www.google.com/s2/favicons?domain=trello.com&sz=64'),
  ('onedrive',   'OneDrive',     'Stockage de fichiers Microsoft',     'Documents',     'https://www.google.com/s2/favicons?domain=onedrive.live.com&sz=64'),
  ('dropbox',    'Dropbox',      'Stockage et partage de fichiers',    'Documents',     'https://www.google.com/s2/favicons?domain=dropbox.com&sz=64'),
  ('github',     'GitHub',       'Dépôts de code et issues',           'Productivité',  'https://www.google.com/s2/favicons?domain=github.com&sz=64'),
  ('gitlab',     'GitLab',       'Dépôts de code et CI/CD',            'Productivité',  'https://www.google.com/s2/favicons?domain=gitlab.com&sz=64'),
  ('mailchimp',  'Mailchimp',    'Campagnes d''emailing marketing',    'Emails',        'https://www.google.com/s2/favicons?domain=mailchimp.com&sz=64'),
  ('googlemeet', 'Google Meet',  'Visioconférences liées à l''agenda', 'Calendrier',    'https://www.google.com/s2/favicons?domain=meet.google.com&sz=64'),
  ('slack',      'Slack',        'Messagerie d''équipe',               'Communication', 'https://www.google.com/s2/favicons?domain=slack.com&sz=64')
ON CONFLICT (id) DO NOTHING;
