# Error Tracking Setup Guide

This app includes comprehensive error handling and is ready for production error tracking integration. Follow this guide to set up monitoring in your deployed environment.

## Option 1: Sentry (Recommended)

Sentry provides real-time error tracking, performance monitoring, and session replay. It's the recommended choice for production applications.

### Setup Steps

1. **Create a Sentry Account**
   - Go to https://sentry.io/signup/
   - Create a new organization
   - Create a new project (select React as the platform)
   - Copy your DSN (Data Source Name) - looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxxx`

2. **Install Sentry in Your Project**
   ```bash
   npm install @sentry/react @sentry/tracing
   ```

3. **Initialize Sentry in `src/main.jsx`**
   ```javascript
   import * as Sentry from "@sentry/react"
   import { BrowserTracing } from "@sentry/tracing"

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     integrations: [
       new BrowserTracing(),
       new Sentry.Replay({
         maskAllText: true,
         blockAllMedia: true,
       }),
     ],
     tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   })

   const SentryErrorBoundary = Sentry.withProfiler(ErrorBoundary)
   
   ReactDOM.createRoot(document.getElementById("root")).render(
     <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
       <SentryErrorBoundary>
         <BrowserRouter>
           <App />
         </BrowserRouter>
       </SentryErrorBoundary>
     </Sentry.ErrorBoundary>,
   )
   ```

4. **Add Environment Variables to `.env`**
   ```
   VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

5. **Set User Context When Logged In**
   In `src/App.jsx`, after user data is available:
   ```javascript
   useEffect(() => {
     if (user) {
       Sentry.setUser({ id: user.id, email: user.email, username: user.username })
     } else {
       Sentry.setUser(null)
     }
   }, [user])
   ```

### What Sentry Tracks
- **Unhandled Exceptions**: Caught by ErrorBoundary
- **Error Events**: From try-catch blocks via logError()
- **Performance**: Page load times, transaction duration
- **Session Replay**: Last 60 seconds before error
- **Breadcrumbs**: Navigation, user interactions, console logs

## Option 2: LogRocket

LogRocket specializes in session replay and frontend monitoring.

1. **Sign up**: https://logrocket.com
2. **Install**: `npm install logrocket`
3. **Initialize in `src/main.jsx`**:
   ```javascript
   import LogRocket from 'logrocket'
   LogRocket.init(import.meta.env.VITE_LOGROCKET_APP_ID)
   ```
4. **Add environment variable**: `VITE_LOGROCKET_APP_ID=your-app-id`

## Option 3: Datadog

Datadog offers comprehensive application performance monitoring.

1. **Sign up**: https://www.datadoghq.com
2. **Install**: `npm install @datadog/browser-rum`
3. **Initialize in `src/main.jsx`**:
   ```javascript
   import { datadogRum } from '@datadog/browser-rum'
   datadogRum.init({
     applicationId: import.meta.env.VITE_DD_APP_ID,
     clientToken: import.meta.env.VITE_DD_CLIENT_TOKEN,
     site: 'datadoghq.com',
     service: 'echo-chamber',
     env: import.meta.env.MODE,
     sessionSampleRate: 100,
     sessionReplaySampleRate: 20,
     trackUserInteractions: true,
     trackResources: true,
     trackLongTasks: true,
     defaultPrivacyLevel: 'mask-user-input',
   })
   datadogRum.startSessionReplayRecording()
   ```

## Error Logging Best Practices

The app uses `logError(context, error)` from `src/lib/errorUtils.js` for all errors:

```javascript
import { logError, formatError } from '../lib/errorUtils'

try {
  // some operation
} catch (e) {
  logError('ComponentName: functionName', e)
  setError(formatError(e))
}
```

This ensures:
- Consistent error formatting
- Context information for debugging
- User-friendly error messages
- Production tracking integration

## Verifying Setup

1. **Test Error Capture**:
   - In development, force an error: `throw new Error('Test error')`
   - Check your error tracking dashboard

2. **Test in Production**:
   - Deploy to production
   - Perform user actions that might trigger errors
   - Monitor your dashboard for incoming events

3. **Custom Events**:
   - You can manually capture events:
   ```javascript
   Sentry.captureMessage('User performed action X', 'info')
   ```

## Monitoring Checklist

- [ ] Error tracking service set up and receiving events
- [ ] User context is being captured
- [ ] Environment variable is set correctly in production
- [ ] Team members have access to dashboard
- [ ] Alerts configured for critical errors
- [ ] Performance tracking is enabled
- [ ] Session replay is enabled for errors
- [ ] Privacy settings protect user data

## Troubleshooting

**Errors not appearing in dashboard?**
- Verify DSN/API keys are correct
- Check browser console for initialization errors
- Ensure error tracking code runs before app code
- Check if errors are being filtered by your settings

**Performance degradation?**
- Reduce `tracesSampleRate` for production
- Disable session replay for non-error sessions
- Consider using an error budget (e.g., sample 10% of sessions)

**Privacy concerns?**
- Use `maskAllText` and `blockAllMedia` in replay settings
- Exclude sensitive data from breadcrumbs
- Configure PII filtering in your service settings
- Review GDPR/privacy implications before deployment

## Production Deployment

Before deploying, ensure:
1. Error tracking service credentials are in your production environment
2. Source maps are uploaded for better stack traces
3. Release tracking is enabled to correlate errors with versions
4. You have monitoring dashboards set up
5. Alerts are configured for your team

## References

- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [LogRocket Docs](https://docs.logrocket.com/)
- [Datadog RUM Docs](https://docs.datadoghq.com/real_user_monitoring/)
