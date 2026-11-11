'use strict';
// Regenerates _headers. The CSP script hashes are computed from index.html so they can never drift from the shipped file.
const fs=require('node:fs'),path=require('node:path');
const {hashes}=require('./csp-hashes.cjs');
// Remote origins are limited to Google sign-in (optional Drive backup) and Google Analytics (loaded only after consent).
const GOOGLE_SIGN_IN="https://accounts.google.com/gsi/client",GOOGLE_TAG="https://www.googletagmanager.com";
// Google Cast sender code, loaded only when Cast to TV is tapped. The /tv/ page a Chromecast opens sets its own policy in a
// meta tag, because the Cast receiver needs connections this strict policy forbids; the header is removed for /tv/ below.
const GOOGLE_CAST="https://www.gstatic.com/cv/js/sender/ https://www.gstatic.com/eureka/clank/ https://www.gstatic.com/cast/sdk/libs/sender/";
const GOOGLE_API="https://www.googleapis.com",GOOGLE_ANALYTICS="https://*.google-analytics.com https://*.analytics.google.com";
const csp=["default-src 'none'","script-src "+hashes.join(' ')+" "+GOOGLE_SIGN_IN+" "+GOOGLE_TAG+" "+GOOGLE_CAST,"style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style","img-src 'self' "+GOOGLE_TAG+" "+GOOGLE_ANALYTICS,"font-src 'self' data:","manifest-src 'self'","worker-src 'self'","connect-src 'self' "+GOOGLE_API+" https://accounts.google.com/gsi/ "+GOOGLE_TAG+" "+GOOGLE_ANALYTICS,"frame-src https://accounts.google.com/gsi/","base-uri 'none'","form-action 'none'","frame-ancestors 'none'","object-src 'none'"].join('; ');
const out=`/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Content-Security-Policy: ${csp}

/
  Cache-Control: no-cache, must-revalidate

/sw.js
  Cache-Control: no-cache, must-revalidate

/tv/*
  ! Content-Security-Policy
  Cache-Control: no-cache, must-revalidate

/manifest.webmanifest
  Cache-Control: no-cache, must-revalidate
`;
const file=path.resolve(__dirname,'..','_headers');
if(process.argv.includes('--check')){const cur=fs.readFileSync(file,'utf8');if(cur!==out){console.error('_headers is stale: run node scripts/write-headers.cjs');process.exit(1);}console.log('HEADERS / CSP HASHES PASS');}
else{fs.writeFileSync(file,out);console.log('wrote _headers');}
