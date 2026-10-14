import React, { useState, useEffect } from 'react';

const App = () => {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (query) {
      fetch(`/api/products?q=${query}`)
        .then(res => res.json())
        .then(data => setProducts(data));
    } else {
      setProducts([]);
    }
  }, [query]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
  };

  return (
    <div>
      <h1>Product Catalogue</h1>
      <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." />
      <ul>
        {products.map(product => <li key={product.id}>{product.name}</li>)}
      </ul>

      <h2>Contact Us</h2>
      <form onSubmit={handleContactSubmit}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" required />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" required></textarea>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default App;
