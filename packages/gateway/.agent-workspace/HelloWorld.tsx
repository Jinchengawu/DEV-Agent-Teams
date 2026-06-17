import React from 'react';

interface HelloWorldProps {
  name?: string;
}

const HelloWorld: React.FC<HelloWorldProps> = ({ name = 'World' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center p-8 bg-white rounded-xl shadow-2xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Hello, {name}! 👋
        </h1>
        <p className="text-gray-600 text-lg">
          Welcome to your React application
        </p>
      </div>
    </div>
  );
};

export default HelloWorld;
