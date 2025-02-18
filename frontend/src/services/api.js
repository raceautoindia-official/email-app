import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const sendEmails = async (data) => {
  const response = await axios.post(`${API_URL}/send`, data);
  return response.data;
};
