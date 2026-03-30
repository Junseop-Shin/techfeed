import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useLogin, useGoogleLogin } from '../../src/hooks/useAuth';
import { trackEvent } from '../../src/api/analytics';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  offlineAccess: false,
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { mutate: doLogin, isPending } = useLogin();
  const { mutate: doGoogleLogin, isPending: isGooglePending } = useGoogleLogin();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    doLogin(
      { email, password },
      {
        onSuccess: () => {
          trackEvent([{ event_type: 'login', metadata: { method: 'email' } }]);
          router.dismiss();
        },
        onError: () => Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.'),
      }
    );
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      doGoogleLogin(tokens.accessToken, {
        onSuccess: () => {
          trackEvent([{ event_type: 'login', metadata: { method: 'google' } }]);
          router.dismiss();
        },
        onError: () => Alert.alert('로그인 실패', 'Google 로그인 중 오류가 발생했습니다.'),
      });
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('오류', 'Google Play Services가 필요합니다.');
        return;
      }
      Alert.alert('오류', 'Google 로그인에 실패했습니다.');
    }
  };

  const isAnyPending = isPending || isGooglePending;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>로그인</Text>
          <TouchableOpacity onPress={() => router.dismiss()} accessibilityRole="button">
            <Text style={styles.closeButton}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="email@example.com"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="비밀번호"
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.button, isAnyPending && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isAnyPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>이메일로 로그인</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/auth/forgot-password')}
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, isAnyPending && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isAnyPending}
          >
            {isGooglePending ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.socialButtonText}>Google로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.consentNotice}>
            계속하면{' '}
            <Text style={styles.consentLink} onPress={() => Linking.openURL(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/legal/terms.html`)}>이용약관</Text>
            {' 및 '}
            <Text style={styles.consentLink} onPress={() => Linking.openURL(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/legal/privacy.html`)}>개인정보처리방침</Text>
            에 동의하는 것으로 간주됩니다.
          </Text>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              router.dismiss();
              router.push('/auth/signup');
            }}
          >
            <Text style={styles.linkText}>계정이 없으신가요? 회원가입</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  closeButton: { fontSize: 15, color: '#6B7280' },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#EA4335' },
  socialButtonText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  forgotButton: { alignItems: 'flex-end', marginTop: 8 },
  forgotText: { fontSize: 13, color: '#6B7280' },
  consentNotice: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  consentLink: { color: '#2563EB', textDecorationLine: 'underline' },
  linkButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  linkText: { fontSize: 14, color: '#2563EB' },
});
