'use client';
import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigurationContext } from '../ContextProvider';
import { loadFromLocalStorage } from '../utils/localStorageUtil';

const url = process.env.NEXT_PUBLIC_API_URL;
const maxKrange = process.env.NEXT_PUBLIC_API_MAX_KRANGE || 15;
const options = JSON.parse(process.env.NEXT_PUBLIC_API_USER_MODELS || '["default", "Claude", "Llama3", "Gemma", "flash", "base"]');

const Dashboard = () => {
  const router = useRouter();
  const { krangeValue, setKrangeValue, kValue, setKValue, userModel, setUserModel } = useContext(ConfigurationContext);
  const [credits, setCredits] = useState('loading...'); 

  // Function to handle the routing back to the main page
  const handleBackToMain = () => {
    router.push('/'); // Change this to the path of your main page if different
  };

  const fetchCredits = async () => {
    const sessionInfo = loadFromLocalStorage('session');
    try {
      const response = await fetch(url + `check_credits?user_id=${sessionInfo.user_id}`);
      const data = await response.json();
      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };
{/*
  useEffect(() => {
    fetchCredits();
  }, []);
*/}
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif',
    },
    card: {
      width: '300px',
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '24px',
      textAlign: 'center',
    },
    controlGroup: {
      marginBottom: '20px',
    },
    labelValueContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    },
    label: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#555',
    },
    slider: {
      width: '100%',
      marginBottom: '8px',
    },
    value: {
      fontSize: '14px',
      color: '#666',
    },
    select: {
      width: '100%',
      padding: '8px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: 'white',
      marginBottom: '8px',
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '20px',
    },
    button: {
      padding: '8px 10px',
      fontSize: '14px',
      color: 'white',
      backgroundColor: '#0D6FFE',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    credits: {
      fontSize: '13px',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>配置选项</h2>
        
        <div style={styles.controlGroup}>
          <div style={styles.labelValueContainer}>
            <label style={styles.label}>max_k:</label>
            <div style={styles.value}>{krangeValue}</div>
          </div>
          <input
            type="range"
            min={10}
            max={maxKrange}
            value={krangeValue}
            onChange={(e) => setKrangeValue(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
        
        <div style={styles.controlGroup}>
          <div style={styles.labelValueContainer}>
            <label style={styles.label}>top_k:</label>
            <div style={styles.value}>{kValue}</div>
          </div>
          <input
            type="range"
            min={2}
            max={6}
            value={kValue}
            onChange={(e) => setKValue(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
        
        <div style={styles.controlGroup}>
          <label style={styles.label}>Interact Model:</label>
          <select
            value={userModel}
            onChange={(e) => setUserModel(e.target.value)}
            style={styles.select}
          >
            {options.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      {/*
        <div style={styles.credits}>
          Credits: {credits}
        </div>
      */}
        <div style={styles.buttonContainer}>
          <button 
            onClick={handleBackToMain} 
            style={styles.button}
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
