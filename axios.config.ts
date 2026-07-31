import axiosLib from 'axios';

const axios = axiosLib.create({
  baseURL: 'https://yxsssitk9a.execute-api.ap-south-1.amazonaws.com/deepaudiobooks-v1/server',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'BNBjJcjP9Q8UqVHV7rjgk4STErZbMptI6E5075Or', // don't hardcode the key
  },
});

export default axios;