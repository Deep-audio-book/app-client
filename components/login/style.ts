
import {
    StyleSheet
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  flex: {
    flex: 1,
  },

  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '64%',
    backgroundColor: '#2E635B',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 24,
  },

  spacer: {
    height: 60,
  },

  form: {
    width: '100%',
    alignItems: 'center',
  },

  logo: {
  width: '100%',
  height: 320,
  alignSelf: 'center',
  marginBottom: 8,
},
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 20,
  },

  field: {
    width: '100%',
    minHeight: 58,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    marginBottom: 14,
  },

  input: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },

  signInButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  signInButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '500',
  },

  forgotButton: {
    marginTop: 16,
    alignItems: 'center',
  },

  forgotText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  footer: {
    marginTop: 40,
    alignItems: 'center',
  },

  createAccountButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  createAccountText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  priceText: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 10,
    fontSize: 13,
  },

  pressed: {
    opacity: 0.7,
  },
});

export default styles;