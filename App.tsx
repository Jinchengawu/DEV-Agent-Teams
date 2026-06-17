import LoginForm from './LoginForm';
import { useLogin } from './useLogin';

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useLogin({
    onSuccess: () => {
      // 登录成功后的跳转
      // window.location.href = '/dashboard';
    },
  });

  return (
    <LoginForm
      title="登录"
      onLogin={async (email, password) => {
        await login({ email, password, rememberMe: false });
      }}
      onRegister={() => {
        console.log('跳转到注册页');
      }}
      onForgotPassword={() => {
        console.log('跳转到忘记密码页');
      }}
      isLoading={isLoading}
      error={error}
    />
  );
}
