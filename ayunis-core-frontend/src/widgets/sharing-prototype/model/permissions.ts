import type { Role } from './types';

export type OrgRole = 'user' | 'manager' | 'admin';

export type EditableOrgRole = Exclude<OrgRole, 'admin'>;

export type PermissionKey =
  | 'manage_teams'
  | 'assign_users_to_teams'
  | 'manage_own_skills'
  | 'install_marketplace_skills'
  | 'request_skill_transfer'
  | 'request_skill_transfer_other_teams'
  | 'request_skill_transfer_org'
  | 'manage_org_skills'
  | 'review_all_skill_requests'
  | 'manage_own_knowledge'
  | 'request_knowledge_transfer'
  | 'request_knowledge_transfer_other_teams'
  | 'request_knowledge_transfer_org'
  | 'manage_org_knowledge'
  | 'review_all_knowledge_requests'
  | 'create_workspaces'
  | 'share_workspaces'
  | 'share_workspaces_org';

export type TeamAdminPermissionKey =
  | 'team_manage_members'
  | 'team_appoint_admins'
  | 'team_manage_skills'
  | 'team_manage_knowledge'
  | 'team_review_requests'
  | 'team_share_workspaces';

export interface PermissionInfo<Key extends string> {
  key: Key;
  label: string;
  hint: string;
  isNew?: boolean;
}

export type PermissionDef = PermissionInfo<PermissionKey>;

export interface PermissionGroup {
  title: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Teams',
    permissions: [
      {
        key: 'manage_teams',
        label: 'Teams verwalten',
        hint: 'Teams erstellen, umbenennen und löschen und in jedem Team Team-Admins ernennen.',
      },
      {
        key: 'assign_users_to_teams',
        label: 'Mitglieder aller Teams pflegen',
        hint: 'Mitglieder zu jedem Team hinzufügen und wieder entfernen. Erlaubt nicht, Teams zu erstellen oder zu löschen.',
      },
    ],
  },
  {
    title: 'Fähigkeiten',
    permissions: [
      {
        key: 'manage_own_skills',
        label: 'Eigene Fähigkeiten verwalten',
        hint: 'Eigene Fähigkeiten erstellen, bearbeiten und löschen. Nutzen kann sie nur die Person selbst.',
      },
      {
        key: 'install_marketplace_skills',
        label: 'Aus dem Marketplace übernehmen',
        hint: 'Fähigkeiten aus dem Ayunis Core Marketplace zu den eigenen hinzufügen. Ohne dieses Recht sind Marketplace-Hinweise und der Menüpunkt ausgeblendet.',
        isNew: true,
      },
      {
        key: 'request_skill_transfer',
        label: 'An eigene Teams übergeben',
        hint: 'Eine eigene Fähigkeit einem Team anbieten, in dem man Mitglied ist. Nach der Freigabe gehört sie dem Team.',
        isNew: true,
      },
      {
        key: 'request_skill_transfer_other_teams',
        label: 'An andere Teams übergeben',
        hint: 'Eine eigene Fähigkeit auch Teams anbieten, in denen man nicht Mitglied ist. Deren Team-Admins prüfen die Anfrage.',
        isNew: true,
      },
      {
        key: 'request_skill_transfer_org',
        label: 'An die Organisation übergeben',
        hint: 'Eine eigene Fähigkeit der ganzen Organisation anbieten. Nach der Freigabe gehört sie der Organisation.',
        isNew: true,
      },
      {
        key: 'manage_org_skills',
        label: 'Fähigkeiten der Organisation verwalten',
        hint: 'Fähigkeiten für alle in der Organisation erstellen, bearbeiten, löschen und für alle verpflichtend machen.',
        isNew: true,
      },
      {
        key: 'review_all_skill_requests',
        label: 'Alle Anfragen beantworten',
        hint: 'Anfragen an die Organisation und an jedes Team freigeben oder ablehnen, auch ohne dort Team-Admin zu sein.',
        isNew: true,
      },
    ],
  },
  {
    title: 'Wissenssammlungen',
    permissions: [
      {
        key: 'manage_own_knowledge',
        label: 'Eigene Wissenssammlungen verwalten',
        hint: 'Eigene Wissenssammlungen und ihre Dokumente erstellen, bearbeiten und löschen.',
      },
      {
        key: 'request_knowledge_transfer',
        label: 'An eigene Teams übergeben',
        hint: 'Eine eigene Wissenssammlung einem Team anbieten, in dem man Mitglied ist. Nach der Freigabe gehört sie dem Team.',
        isNew: true,
      },
      {
        key: 'request_knowledge_transfer_other_teams',
        label: 'An andere Teams übergeben',
        hint: 'Eine eigene Wissenssammlung auch Teams anbieten, in denen man nicht Mitglied ist. Deren Team-Admins prüfen die Anfrage.',
        isNew: true,
      },
      {
        key: 'request_knowledge_transfer_org',
        label: 'An die Organisation übergeben',
        hint: 'Eine eigene Wissenssammlung der ganzen Organisation anbieten. Nach der Freigabe gehört sie der Organisation.',
        isNew: true,
      },
      {
        key: 'manage_org_knowledge',
        label: 'Wissenssammlungen der Organisation verwalten',
        hint: 'Wissenssammlungen für alle in der Organisation erstellen, bearbeiten und löschen.',
        isNew: true,
      },
      {
        key: 'review_all_knowledge_requests',
        label: 'Alle Anfragen beantworten',
        hint: 'Anfragen an die Organisation und an jedes Team freigeben oder ablehnen, auch ohne dort Team-Admin zu sein.',
        isNew: true,
      },
    ],
  },
  {
    title: 'Arbeitsbereiche',
    permissions: [
      {
        key: 'create_workspaces',
        label: 'Arbeitsbereiche erstellen',
        hint: 'Eigene Arbeitsbereiche anlegen und darin Fähigkeiten und Wissen verknüpfen.',
        isNew: true,
      },
      {
        key: 'share_workspaces',
        label: 'Arbeitsbereiche verwalten',
        hint: 'Personen und Teams in Arbeitsbereiche einladen, in denen man Vollzugriff hat. Eingeladene nutzen alles, was dort verknüpft ist.',
        isNew: true,
      },
      {
        key: 'share_workspaces_org',
        label: 'Für die ganze Organisation freigeben',
        hint: 'Einen Arbeitsbereich für alle in der Organisation öffnen. Alle nutzen dann, was dort verknüpft ist.',
        isNew: true,
      },
    ],
  },
];

export const TEAM_ADMIN_PERMISSIONS: PermissionInfo<TeamAdminPermissionKey>[] =
  [
    {
      key: 'team_manage_members',
      label: 'Mitglieder hinzufügen und entfernen',
      hint: 'Personen ins eigene Team aufnehmen und wieder entfernen.',
    },
    {
      key: 'team_appoint_admins',
      label: 'Team-Admins ernennen',
      hint: 'Andere Mitglieder des eigenen Teams zum Team-Admin machen oder die Rolle wieder entziehen.',
    },
    {
      key: 'team_manage_skills',
      label: 'Fähigkeiten für das Team verwalten',
      hint: 'Fähigkeiten des Teams erstellen, bearbeiten und löschen.',
    },
    {
      key: 'team_manage_knowledge',
      label: 'Wissenssammlungen für das Team verwalten',
      hint: 'Wissenssammlungen des Teams erstellen, bearbeiten und löschen.',
    },
    {
      key: 'team_review_requests',
      label: 'Anfragen an das Team beantworten',
      hint: 'Übergaben an das eigene Team freigeben oder ablehnen.',
    },
    {
      key: 'team_share_workspaces',
      label: 'Arbeitsbereiche für das Team verwalten',
      hint: 'Das eigene Team oder einzelne Mitglieder daraus in Arbeitsbereiche einladen, in denen sie Vollzugriff haben. Gilt auch, wenn Benutzer und Manager Arbeitsbereiche nicht verwalten dürfen.',
    },
  ];

export const DEFAULT_TEAM_ADMIN_PERMISSIONS: TeamAdminPermissionKey[] =
  TEAM_ADMIN_PERMISSIONS.map((permission) => permission.key);

export const DEFAULT_PERMISSIONS: Record<EditableOrgRole, PermissionKey[]> = {
  user: [
    'manage_own_skills',
    'install_marketplace_skills',
    'request_skill_transfer',
    'request_skill_transfer_org',
    'manage_own_knowledge',
    'request_knowledge_transfer',
    'request_knowledge_transfer_org',
    'create_workspaces',
    'share_workspaces',
  ],
  manager: [
    'assign_users_to_teams',
    'manage_own_skills',
    'install_marketplace_skills',
    'request_skill_transfer',
    'request_skill_transfer_org',
    'manage_own_knowledge',
    'request_knowledge_transfer',
    'request_knowledge_transfer_org',
    'create_workspaces',
    'share_workspaces',
  ],
};

export function orgRoleOf(role: Role): OrgRole {
  return role === 'orgAdmin' ? 'admin' : 'user';
}
