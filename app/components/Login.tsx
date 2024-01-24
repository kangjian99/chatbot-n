import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // 导入 Bootstrap

const url = process.env.NEXT_PUBLIC_API_URL;

// 定义 props 类型接口
interface LoginProps {
    onLoginSuccess: (userData: any) => void;  // 这里可以根据实际的用户数据类型更具体地定义类型
  }
  
function Login({ onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // 这里发送请求到您的后端进行登录验证
        try {
            const response = await fetch(url + 'login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'  // 一定要有这个设置才能跨域携带cookie
            });

            if (response.ok) {
                // 假设登录成功后，后端返回用户信息
                // const userData = await response.json();
                onLoginSuccess(username); // 把username传递给回调函数onLoginSuccess
            } else {
                // 登录失败，显示错误信息
                setErrorMessage('登录失败：用户名或密码错误');
            }
        } catch (error) {
            console.error('登录错误:', error);
            setErrorMessage('登录时出现错误，请稍后再试');
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <form className="card p-3" style={{ width: '400px', margin: '0 auto' }} onSubmit={handleSubmit}>
                <h1 className="text-center mb-4">Login</h1>
                {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        className="form-control"
                        id="username"
                        name="username"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
                <br />
                <button type="submit" className="btn btn-primary align-self-center">Login</button>
            </form>
        </div>
    );
}

export default Login;
