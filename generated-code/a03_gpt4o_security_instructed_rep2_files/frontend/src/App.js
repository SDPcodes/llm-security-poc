import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', message: '' });

  const searchProducts = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`/api/products?q=${encodeURIComponent(query)}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const submitContact = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/contact', contact, {
        headers: {'CSRF-Token': 'your-csrf-token'} // Replace with actual CSRF token
      });
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="App">
      <h1>Product Catalogue</h1>
      <form onSubmit={searchProducts}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
        />
        <button type="submit">Search</button>
      </form>

      <ul>
        {products.map(product => <li key={product.id}>{product.name}</li>)}
      </ul>

      <h2>Contact Us</h2>
      <form onSubmit={submitContact}>
        <input
          type="text"
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
          placeholder="Name"
          required
        />
        <input
          type="email"
          value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
          placeholder="Email"
          required
        />
        <textarea
          value={contact.message}
          onChange={(e) => setContact({ ...contact, message: e.target.value })}
          placeholder="Message"
          required
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
