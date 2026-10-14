import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/products?q=${search}`)
      .then(res => res.json())
      .then(data => setProducts(data));
  }, [search]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleSubmitContact = (e) => {
    e.preventDefault();
    fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, message })
    }).then(() => {
      setName('');
      setEmail('');
      setMessage('');
      alert('Message sent');
    });
  };

  return (
    <div className="App">
      <h1>Product Catalogue</h1>
      <input
        type="text"
        value={search}
        onChange={handleSearchChange}
        placeholder="Search products"
      />
      <ul>
        {products.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>

      <h2>Contact Us</h2>
      <form onSubmit={handleSubmitContact}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          required
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your Message"
          required
        />
        <button type="submit">Send Message</button>
      </form>
    </div>
  );
}

export default App;
