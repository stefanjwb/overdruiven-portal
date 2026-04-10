import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Text, TextInput, PasswordInput, Button,
  Stack, Tabs, Anchor, Stepper, Group, Avatar, FileButton, ActionIcon,
  Alert, List,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCamera, IconX, IconMailCheck, IconInfoCircle } from '@tabler/icons-react';
import { login, checkInvite, sendVerificationCode, verifyCode, register, requestMagicLink } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import logoVolledig from '../assets/logo-volledig.png';

const PASSWORD_RULES = [
  { re: /.{8,}/, label: 'Minimaal 8 tekens' },
  { re: /[A-Z]/, label: 'Minimaal 1 hoofdletter' },
  { re: /[a-z]/, label: 'Minimaal 1 kleine letter' },
  { re: /\d/, label: 'Minimaal 1 cijfer' },
  { re: /[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/, label: 'Minimaal 1 speciaal teken (!@#$%...)' },
];

function validatePassword(v: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.re.test(v)) return rule.label;
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [tab, setTab] = useState<string>('login');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [magicSent, setMagicSent] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const resetRef = useRef<() => void>(null);

  const [inviteCode, setInviteCode] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const loginForm = useForm({
    initialValues: { username: '', password: '' },
    validate: {
      username: (v) => (v.trim() ? null : 'Vul je gebruikersnaam in'),
      password: (v) => (v ? null : 'Vul je wachtwoord in'),
    },
  });

  const step1Form = useForm({
    initialValues: { invite_code: '' },
    validate: {
      invite_code: (v) => (v.trim() ? null : 'Vul je uitnodigingscode in'),
    },
  });

  const step2Form = useForm({
    initialValues: { first_name: '', last_name: '', email: '' },
    validate: {
      first_name: (v) => (v.trim() ? null : 'Vul je voornaam in'),
      last_name: (v) => (v.trim() ? null : 'Vul je achternaam in'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Vul een geldig e-mailadres in'),
    },
  });

  const step3Form = useForm({
    initialValues: { code: '' },
    validate: {
      code: (v) => (v.trim().length === 8 ? null : 'Vul de 8-tekens code in (letters en cijfers)'),
    },
  });

  const step4Form = useForm({
    initialValues: { password: '', confirm_password: '' },
    validate: {
      password: validatePassword,
      confirm_password: (v, vals) => (v === vals.password ? null : 'Wachtwoorden komen niet overeen'),
    },
  });

  const handleLogin = async (values: typeof loginForm.values) => {
    setBusy(true);
    try {
      await login(values.username, values.password);
      await loginSuccess();
      notifications.show({ message: 'Welkom terug!', color: 'green' });
      navigate('/');
    } catch (err: any) {
      notifications.show({
        title: 'Inloggen mislukt',
        message: err.response?.data?.detail || 'Controleer je gegevens.',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  const magicForm = useForm({
    initialValues: { email: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Vul een geldig e-mailadres in'),
    },
  });

  const handleMagicLink = async (values: typeof magicForm.values) => {
    setBusy(true);
    try {
      await requestMagicLink(values.email);
      setMagicSent(true);
    } catch {
      setMagicSent(true);
    } finally {
      setBusy(false);
    }
  };

  const handleStep1 = async (values: typeof step1Form.values) => {
    setBusy(true);
    try {
      await checkInvite(values.invite_code);
      setInviteCode(values.invite_code);
      setStep(1);
    } catch (err: any) {
      notifications.show({
        title: 'Ongeldige code',
        message: err.response?.data?.detail || 'Controleer de uitnodigingscode.',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleStep2 = async (values: typeof step2Form.values) => {
    setBusy(true);
    try {
      await sendVerificationCode({
        invite_code: inviteCode,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
      });
      setRegEmail(values.email);
      setStep(2);
    } catch (err: any) {
      notifications.show({
        title: 'Fout',
        message: err.response?.data?.detail || 'Er is iets misgegaan.',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleStep3 = async (values: typeof step3Form.values) => {
    setBusy(true);
    try {
      await verifyCode(regEmail, values.code);
      setStep(3);
    } catch (err: any) {
      notifications.show({
        title: 'Verificatie mislukt',
        message: err.response?.data?.detail || 'Onjuiste of verlopen code.',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleStep4 = async (values: typeof step4Form.values) => {
    setBusy(true);
    try {
      await register({ email: regEmail, password: values.password, avatar });
      notifications.show({ message: 'Account aangemaakt! Je kunt nu inloggen.', color: 'green' });
      setStep(0);
      setAvatar(null);
      setInviteCode('');
      setRegEmail('');
      step1Form.reset();
      step2Form.reset();
      step3Form.reset();
      step4Form.reset();
      setTab('login');
    } catch (err: any) {
      notifications.show({
        title: 'Registratie mislukt',
        message: err.response?.data?.detail || 'Er is iets misgegaan.',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notifications.show({ message: 'Afbeelding is te groot (max. 2 MB).', color: 'red' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setAvatar(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Container size={420} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img src={logoVolledig} alt="Château Overdruiven" style={{ height: 60, width: 'auto' }} />
        </div>

        <Paper withBorder shadow="md" p={30} radius="md">
          <Tabs value={tab} onChange={v => { setTab(v ?? 'login'); setStep(0); setMagicSent(false); }} color="brand">
            <Tabs.List grow mb="md">
              <Tabs.Tab value="login">Inloggen</Tabs.Tab>
              <Tabs.Tab value="register">Registreren</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="login">
              <form onSubmit={loginForm.onSubmit(handleLogin)}>
                <Stack gap="md">
                  <TextInput
                    label="Gebruikersnaam"
                    placeholder="Jouw gebruikersnaam"
                    required
                    {...loginForm.getInputProps('username')}
                  />
                  <PasswordInput
                    label="Wachtwoord"
                    placeholder="Jouw wachtwoord"
                    required
                    {...loginForm.getInputProps('password')}
                  />
                  <Button type="submit" fullWidth color="brand" loading={busy} mt="xs">
                    Inloggen
                  </Button>
                </Stack>
              </form>
              <Text size="sm" ta="center" mt="md" c="dimmed">
                Inloggen met magische link?{' '}
                <Anchor size="sm" c="brand" onClick={() => { setTab('magic'); setMagicSent(false); }}>
                  Klik hier
                </Anchor>
              </Text>
            </Tabs.Panel>

            <Tabs.Panel value="magic">
              {magicSent ? (
                <Alert icon={<IconMailCheck size={18} />} color="brand" radius="md">
                  <Text size="sm">
                    Als dit e-mailadres bij ons bekend is, ontvang je zo een inloglink.
                    Controleer ook je spammap.
                  </Text>
                </Alert>
              ) : (
                <form onSubmit={magicForm.onSubmit(handleMagicLink)}>
                  <Stack gap="md">
                    <Text size="sm" c="dimmed">
                      Vul je e-mailadres in en we sturen je een link waarmee je direct kunt inloggen — geen wachtwoord nodig.
                    </Text>
                    <TextInput
                      label="E-mailadres"
                      placeholder="jouw@email.com"
                      required
                      {...magicForm.getInputProps('email')}
                    />
                    <Button type="submit" fullWidth color="brand" loading={busy}>
                      Stuur inloglink
                    </Button>
                  </Stack>
                </form>
              )}
              <Text size="sm" ta="center" mt="md" c="dimmed">
                <Anchor size="sm" c="brand" onClick={() => setTab('login')}>
                  Terug naar inloggen
                </Anchor>
              </Text>
            </Tabs.Panel>

            <Tabs.Panel value="register">
              <Stepper active={step} color="brand" size="sm" mb="lg" styles={{ steps: { justifyContent: 'center' } }}>
                {['Uitnodiging', 'Gegevens', 'Verificatie', 'Wachtwoord']
                  .slice(0, step + 1)
                  .map((label) => (
                    <Stepper.Step key={label} label={label} />
                  ))}
              </Stepper>

              {step === 0 && (
                <form onSubmit={step1Form.onSubmit(handleStep1)}>
                  <Stack gap="md">
                    <TextInput
                      label="Uitnodigingscode"
                      placeholder="Vul je code in"
                      required
                      {...step1Form.getInputProps('invite_code')}
                    />
                    <Button type="submit" fullWidth color="brand" loading={busy}>
                      Volgende
                    </Button>
                  </Stack>
                </form>
              )}

              {step === 1 && (
                <form onSubmit={step2Form.onSubmit(handleStep2)}>
                  <Stack gap="md">
                    <Group grow>
                      <TextInput
                        label="Voornaam"
                        placeholder="Jan"
                        required
                        {...step2Form.getInputProps('first_name')}
                      />
                      <TextInput
                        label="Achternaam"
                        placeholder="Janssen"
                        required
                        {...step2Form.getInputProps('last_name')}
                      />
                    </Group>
                    <TextInput
                      label="E-mailadres"
                      placeholder="jouw@email.com"
                      required
                      {...step2Form.getInputProps('email')}
                    />
                    <Group grow>
                      <Button variant="default" onClick={() => setStep(0)}>
                        Terug
                      </Button>
                      <Button type="submit" color="brand" loading={busy}>
                        Verstuur code
                      </Button>
                    </Group>
                  </Stack>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={step3Form.onSubmit(handleStep3)}>
                  <Stack gap="md">
                    <Text size="sm" c="dimmed">
                      We hebben een verificatiecode (8 tekens) verstuurd naar <strong>{regEmail}</strong>.
                    </Text>
                    <TextInput
                      label="Verificatiecode"
                      placeholder="bijv. A3X9K2MQ"
                      maxLength={8}
                      required
                      style={{ textTransform: 'uppercase' }}
                      {...step3Form.getInputProps('code')}
                    />
                    <Group grow>
                      <Button variant="default" onClick={() => setStep(1)}>
                        Terug
                      </Button>
                      <Button type="submit" color="brand" loading={busy}>
                        Verifieer
                      </Button>
                    </Group>
                  </Stack>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={step4Form.onSubmit(handleStep4)}>
                  <Stack gap="md">
                    <Alert icon={<IconInfoCircle size={16} />} color="brand" variant="light" radius="md">
                      <List size="xs" spacing={2}>
                        {PASSWORD_RULES.map((r) => (
                          <List.Item key={r.label}>{r.label}</List.Item>
                        ))}
                      </List>
                    </Alert>
                    <PasswordInput
                      label="Wachtwoord"
                      placeholder="Kies een sterk wachtwoord"
                      required
                      {...step4Form.getInputProps('password')}
                    />
                    <PasswordInput
                      label="Wachtwoord bevestigen"
                      placeholder="Herhaal je wachtwoord"
                      required
                      {...step4Form.getInputProps('confirm_password')}
                    />

                    <Stack gap={4} align="center">
                      <Text size="sm" fw={500}>Profielfoto (optioneel)</Text>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Avatar src={avatar} size={80} radius="xl" color="brand">
                          {step2Form.values.first_name?.[0]?.toUpperCase()}
                          {step2Form.values.last_name?.[0]?.toUpperCase()}
                        </Avatar>
                        {avatar && (
                          <ActionIcon
                            size="xs"
                            color="red"
                            variant="filled"
                            radius="xl"
                            style={{ position: 'absolute', top: 0, right: 0 }}
                            onClick={() => { setAvatar(null); resetRef.current?.(); }}
                          >
                            <IconX size={10} />
                          </ActionIcon>
                        )}
                      </div>
                      <FileButton resetRef={resetRef} onChange={handleAvatarFile} accept="image/*">
                        {(props) => (
                          <Button
                            {...props}
                            variant="light"
                            color="brand"
                            size="xs"
                            leftSection={<IconCamera size={14} />}
                          >
                            {avatar ? 'Foto wijzigen' : 'Foto toevoegen'}
                          </Button>
                        )}
                      </FileButton>
                    </Stack>

                    <Button type="submit" fullWidth color="brand" loading={busy} mt="xs">
                      Account aanmaken
                    </Button>
                  </Stack>
                </form>
              )}

              <Text size="sm" ta="center" mt="md" c="dimmed">
                Al een account?{' '}
                <Anchor size="sm" c="brand" onClick={() => setTab('login')}>
                  Log hier in
                </Anchor>
              </Text>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </div>
    </Container>
  );
}
