import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProfileUpdate() {
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormData({ username: res.data.username, email: res.data.email });
      } catch (err) {
        console.error(err.response.data);
      }
    };

    fetchData();
  }, []);

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/users/update', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profile updated successfully');
    } catch (err) {
      console.error(err.response.data);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input type="text" name="username" value={formData.username} onChange={onChange} placeholder="Username" required />
      <input type="email" name="email" value={formData.email} onChange={onChange} placeholder="Email" required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default ProfileUpdate;
