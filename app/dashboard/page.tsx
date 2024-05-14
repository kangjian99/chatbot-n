'use client';
import React, { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigurationContext } from '../ContextProvider';

const Dashboard = () => {
  const router = useRouter();
  const { krangeValue, setKrangeValue, kValue, setKValue } = useContext(ConfigurationContext);
  const { userModel, setUserModel } = useContext(ConfigurationContext);

  // Function to handle the routing back to the main page
  const handleBackToMain = () => {
    router.push('/'); // Change this to the path of your main page if different
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '250px', border: '1px solid #ccc', padding: '20px', borderRadius: '10px', backgroundColor: '#f8f9fa' }}>
        <p style={{ textAlign: 'center', color: '#000', fontSize: '16px' }}>配置选项</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>max_k:</label>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
            <input
              type="range"
              min="10"
              max="15"
              value={krangeValue}
              onChange={(e) => setKrangeValue(Number(e.target.value))}
              className="form-range"
              style={{ flexGrow: 1 }}
              title='max top_k'
            />
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>{krangeValue}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>top_k:</label>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
            <input
              type="range"
              min="2"
              max="6"
              value={kValue}
              onChange={(e) => setKValue(Number(e.target.value))}
              className="form-range"
              style={{ flexGrow: 1 }}
              title='top_k'
            />
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>{kValue}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>Interact Model:</label>
          <select
            value={userModel}
            onChange={(e) => setUserModel(e.target.value)}
            style={{ width: "120px", fontSize: '14px' }}
          >
            <option value="default">default</option>
            <option value="Claude">Claude</option>
            <option value="Llama3">Llama3</option>
            <option value="nonClaude">nonClaude</option>
          </select>
        </div>
        <button onClick={handleBackToMain} style={{ 
          padding: '5px 10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
          background: '#0D6FFE',
          color: 'white',
          fontSize: "12px",
          marginTop: "20px",
          marginLeft: 'auto',  // 使按钮向右浮动
          display: 'block'  // 使按钮独占一行
        }}>主页</button>
      </div>
    </div>
  );  
};

export default Dashboard;
