import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:4000/profile', { withCredentials: true });
        setFormData(res.data);
      } catch (err) {
        alert('Error fetching profile');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:4000/profile', formData, { withCredentials: true });
      alert('Profile updated');
    } catch (err) {
      alert('Error updating profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" />
      <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
      <button type="submit">Update</button>
    </form>
  );
}
