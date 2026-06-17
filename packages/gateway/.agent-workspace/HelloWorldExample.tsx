import React, { useState } from 'react';
import HelloWorld from './HelloWorld';

// Example showing different usage patterns
const HelloWorldExample: React.FC = () => {
  const [name, setName] = useState('World');

  return (
    <div>
      {/* Default usage */}
      <HelloWorld />
      
      {/* With custom name */}
      <HelloWorld name="React" />
      
      {/* With state */}
      <div className="p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="border p-2 rounded"
        />
        <HelloWorld name={name} />
      </div>
    </div>
  );
};

export default HelloWorldExample;
