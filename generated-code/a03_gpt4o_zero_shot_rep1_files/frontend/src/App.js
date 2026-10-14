import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (searchTerm) {
      fetch(`/api/products?q=${searchTerm}`)
        .then(response => response.json())
        .then(data => setProducts(data));
    }
  }, [searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleContactSubmit = (event) => {
    event.preventDefault();
    fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, message }),
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Message sent successfully');
          setName('');
          setEmail('');
          setMessage('');
        }
      });
  };

  return (
    <div className="App">
      <h1>Product Catalogue</h1>
      <input
        type="text"
        placeholder="Search products..."
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul>
        {products.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>

      <h2>Contact Us</h2>
      <form onSubmit={handleContactSubmit}>
        <div>
          <label>Name:</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Message:</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required />
        </div>
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
