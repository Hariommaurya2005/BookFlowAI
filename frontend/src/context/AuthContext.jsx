import { createContext, useContext, useEffect, useReducer } from 'react';
import api from '../services/api';
import { clearTokens, getToken, setTokens } from '../services/tokenStorage';

const AuthContext = createContext(null);
const initialState = { user: null, organization: null, loading: true, isAuthenticated: false };

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload.user, organization: action.payload.organization, isAuthenticated: true, loading: false };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const token = getToken('accessToken');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => dispatch({ type: 'SET_USER', payload: { user: data.data.user, organization: data.data.organization } }))
      .catch(() => {
        clearTokens();
        dispatch({ type: 'SET_LOADING', payload: false });
      });
  }, []);

  const login = async (credentials) => {
    const { remember = true, ...payload } = credentials;
    const { data } = await api.post('/auth/login', payload);
    setTokens(data.data, remember);
    dispatch({ type: 'SET_USER', payload: { user: data.data.user, organization: data.data.organization } });
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setTokens(data.data, true);
    dispatch({ type: 'SET_USER', payload: { user: data.data.user, organization: data.data.organization } });
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* Local sign-out still proceeds. */ }
    clearTokens();
    dispatch({ type: 'LOGOUT' });
  };

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
