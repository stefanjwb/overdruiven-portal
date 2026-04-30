import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell, Burger, Group, Text, NavLink, Avatar, UnstyledButton, Box, Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUsers, IconCalendarEvent, IconArrowLeft,
  IconLogout, IconCreditCard, IconHistory, IconPackage, IconBottle, IconReceipt, IconChartBar,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { getAdminPayments } from '../../api/admin';
import { getAdminDeclarations } from '../../api/declarations';
import logoVolledig from '../../assets/logo-volledig.png';
import classes from './AdminLayout.module.css';

export default function AdminLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDeclarations, setPendingDeclarations] = useState(0);

  useEffect(() => {
    getAdminPayments().then(p => setPendingCount(p.filter((p: any) => p.status === 'pending_verification').length)).catch(() => {});
    getAdminDeclarations().then(d => setPendingDeclarations(d.filter((d: any) => d.status === 'pending').length)).catch(() => {});
  }, [loc.pathname]);

  const doLogout = () => {
    logout();
    notifications.show({ message: 'Uitgelogd!', color: 'green' });
    navigate('/login');
    close();
  };

  const go = (to: string) => { navigate(to); close(); };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      {/* Header */}
      <AppShell.Header>
        <div className={classes.header}>
          <div className={classes.headerLeft}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </div>
          <UnstyledButton component={Link} to="/">
            <img src={logoVolledig} alt="Château Overdruiven" style={{ height: 36, width: 'auto' }} />
          </UnstyledButton>
          <div className={classes.headerRight}>
            <UnstyledButton
              component={Link}
              to="/"
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--mantine-color-gray-6)' }}
            >
              <IconArrowLeft size={16} />
              <Text size="sm" visibleFrom="sm">Terug</Text>
            </UnstyledButton>
          </div>
        </div>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar className={classes.navbar}>
        <div className={classes.navbarMain}>
          <Text className={classes.sectionLabel}>Beheer</Text>

          <NavLink label="Gebruikers" leftSection={<IconUsers size={18} />}
            active={loc.pathname === '/admin/gebruikers'}
            onClick={() => go('/admin/gebruikers')} color="brand" />

<NavLink label="Activiteiten" leftSection={<IconCalendarEvent size={18} />}
            active={loc.pathname === '/admin/activiteiten'}
            onClick={() => go('/admin/activiteiten')} color="brand" />

          <NavLink label="Statistieken" leftSection={<IconChartBar size={18} />}
            active={loc.pathname === '/admin/statistieken'}
            onClick={() => go('/admin/statistieken')} color="brand" />

          <Text className={classes.sectionLabel} mt="md">Betalingen</Text>

          <NavLink
            label="Openstaand"
            leftSection={<IconCreditCard size={18} />}
            rightSection={pendingCount > 0 ? <Badge size="xs" color="red" circle>{pendingCount}</Badge> : null}
            active={loc.pathname === '/admin/betalingen'}
            onClick={() => go('/admin/betalingen')}
            color="brand"
          />

          <NavLink label="Historie" leftSection={<IconHistory size={18} />}
            active={loc.pathname === '/admin/betalingen/historie'}
            onClick={() => go('/admin/betalingen/historie')} color="brand" />

          <NavLink
            label="Declaraties"
            leftSection={<IconReceipt size={18} />}
            rightSection={pendingDeclarations > 0 ? <Badge size="xs" color="red" circle>{pendingDeclarations}</Badge> : null}
            active={loc.pathname === '/admin/declaraties'}
            onClick={() => go('/admin/declaraties')}
            color="brand"
          />

          <Text className={classes.sectionLabel} mt="md">Club</Text>

          <NavLink label="Inventaris" leftSection={<IconPackage size={18} />}
            active={loc.pathname === '/admin/inventaris'}
            onClick={() => go('/admin/inventaris')} color="brand" />

          <NavLink label="Wijnbibliotheek" leftSection={<IconBottle size={18} />}
            active={loc.pathname === '/admin/wijnbibliotheek'}
            onClick={() => go('/admin/wijnbibliotheek')} color="brand" />
        </div>

        <div className={classes.navbarFooter}>
          <Box px="xs" py={6}>
            <Group gap="sm">
              <Avatar size={32} radius="xl" color="brand">
                {[user?.first_name, user?.last_name].filter(Boolean).map(n => n![0].toUpperCase()).join('') || (user?.username?.slice(0, 2).toUpperCase() ?? '')}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>{user?.username}</Text>
                <Text size="xs" c="dimmed" truncate>{user?.email}</Text>
              </div>
            </Group>
          </Box>
          <NavLink label="Uitloggen" leftSection={<IconLogout size={18} />}
            onClick={doLogout} color="red" variant="subtle" />
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
