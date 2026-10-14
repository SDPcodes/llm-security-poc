import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSearch = async () => {
    try {
      const response = await axios.get(`/api/products?q=${query}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/contact', form);
      alert('Message sent successfully');
      setForm({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error sending message', error);
    }
  };

  return (
    <div>
      <h1>Product Catalogue</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <button onClick={handleSearch}>Search</button>

      <ul>
        {products.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>

      <h2>Contact Us</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <textarea
          placeholder="Message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
