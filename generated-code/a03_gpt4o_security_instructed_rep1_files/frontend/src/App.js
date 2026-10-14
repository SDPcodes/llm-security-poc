import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (query) {
      axios.get(`/api/products?q=${encodeURIComponent(query)}`)
        .then(response => setProducts(response.data))
        .catch(err => console.error(err));
    }
  }, [query]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/contact', { name, email, message })
      .then(() => {
        setName('');
        setEmail('');
        setMessage('');
        alert('Message sent!');
      })
      .catch(err => console.error(err));
  };

  return (
    <div>
      <h1>Product Catalogue</h1>
      <input 
        type="text" 
        placeholder="Search products" 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
      />
      <ul>
        {products.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
      <h2>Contact Us</h2>
      <form onSubmit={handleContactSubmit}>
        <input 
          type="text" 
          placeholder="Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required
        />
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required
        />
        <textarea 
          placeholder="Message" 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          required
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
