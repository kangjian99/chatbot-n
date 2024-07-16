'use client';

import React, { createContext, useState, ReactNode, FC } from 'react';

const default_k = process.env.NEXT_PUBLIC_API_K || 4;
const default_userModel = process.env.NEXT_PUBLIC_API_USER_MODEL || "default";

interface ConfigurationContextType {
  krangeValue: number;
  setKrangeValue: (value: number) => void;
  kValue: number;
  setKValue: (value: number) => void;
  userModel: string;
  setUserModel: (value: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (value: string) => void;
}

const ConfigurationContext = createContext<ConfigurationContextType>(null!);

interface ContextProviderProps {
  children: ReactNode;
}

const ContextProvider: FC<ContextProviderProps> = ({ children }) => {
  const [krangeValue, setKrangeValue] = useState(10); // Initial state value
  const [kValue, setKValue] = useState(Number(default_k)); 
  const [userModel, setUserModel] = useState(default_userModel);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  return (
    <ConfigurationContext.Provider 
        value={{ 
          krangeValue, setKrangeValue, 
          kValue, setKValue, 
          userModel, setUserModel, 
          selectedTemplate, setSelectedTemplate 
        }}>
      {children}
    </ConfigurationContext.Provider> // 将 children 组件包裹在 context.Provider 中，使其可访问这些值
  );
};

export { ConfigurationContext, ContextProvider };