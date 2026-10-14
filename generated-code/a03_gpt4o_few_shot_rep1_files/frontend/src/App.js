import React, { useState } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({name: '', email: '', message: ''});

  const searchProducts = async () => {
    const response = await fetch(`/api/products?q=${query}`);
    const data = await response.json();
    setProducts(data);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/contact', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(message)
    });
    setMessage({name: '', email: '', message: ''});
  };

  return (
    <div>
      <h1>Product Catalogue</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products"
      />
      <button onClick={searchProducts}>Search</button>
      <ul>
        {products.map(product => (
          <li key={product.id}>{product.name} - ${product.price}</li>
        ))}
      </ul>

      <h2>Contact Us</h2>
      <form onSubmit={handleContactSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={message.name}
          onChange={(e) => setMessage({...message, name: e.target.value})}
        />
        <input
          type="email"
          placeholder="Email"
          value={message.email}
          onChange={(e) => setMessage({...message, email: e.target.value})}
        />
        <textarea
          placeholder="Message"
          value={message.message}
          onChange={(e) => setMessage({...message, message: e.target.value})}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
