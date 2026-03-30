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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { apiClient } from '../../src/api/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }
    setIsPending(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      Alert.alert('오류', '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>이메일 전송됨</Text>
            <TouchableOpacity onPress={() => router.dismiss()} accessibilityRole="button">
              <Text style={styles.closeButton}>닫기</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sentIcon}>📧</Text>
          <Text style={styles.sentMessage}>
            {`해당 이메일로 가입된 계정이 있다면\n비밀번호 재설정 안내 메일을 보냈습니다.\n\n메일함을 확인해주세요.`}
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.dismiss()} accessibilityRole="button">
            <Text style={styles.buttonText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>비밀번호 찾기</Text>
          <TouchableOpacity onPress={() => router.dismiss()} accessibilityRole="button">
            <Text style={styles.closeButton}>닫기</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 안내를 보내드립니다.
        </Text>

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
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
          accessibilityRole="button"
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>재설정 메일 보내기</Text>
          )}
        </TouchableOpacity>
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
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  closeButton: { fontSize: 15, color: '#6B7280' },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
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
  sentIcon: { fontSize: 48, textAlign: 'center', marginTop: 40, marginBottom: 16 },
  sentMessage: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});
