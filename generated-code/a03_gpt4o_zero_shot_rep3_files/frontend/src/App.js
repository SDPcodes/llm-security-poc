import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (search) {
      axios.get(`/api/products?q=${search}`).then(response => {
        setProducts(response.data);
      });
    }
  }, [search]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/contact', { name, email, message })
      .then(response => {
        alert('Message sent successfully');
      })
      .catch(error => {
        alert('Failed to send message');
      });
  };

  return (
    <div>
      <h1>Product Catalogue</h1>
      <input 
        type="text" 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        placeholder="Search for products..." 
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
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="Your Name" 
          required 
        />
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Your Email" 
          required 
        />
        <textarea 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          placeholder="Your Message" 
          required 
        ></textarea>
        <button type="submit">Send Message</button>
      </form>
    </div>
  );
}

export default App;
