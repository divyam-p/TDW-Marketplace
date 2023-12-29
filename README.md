# TDW Market

## Deployed Site 
https://tdwmarket.me/

## Video Presentation Link

https://youtu.be/Pmf4oRrXbqg

## Team Members

| Full Name         | 
| ----------------- |
| Divyam Patel      |
| Tapas Rastogi     |
| Winson Yuan       |

## Concepts Implemented
- `OAuth 2.0` - Users are able to sign in to our application using other oauth providers such as Google and authorization for multiple scopes such as access to their google calendar 
- `Real-time interaction` - Sellers are able to host live bidding sessions with a video chat where they can disconnect all the other users in the video call 
- `Workers` - Utilize workers in backend to send emails three minutes after signing up, and for setting the event in their google calendar 
- Enhance the UI with library components such as Tailwind CSS
- Workers implemented to send emails after user registers, and when adding event to calendar
- Deploy web application in a digital ocean vm

## Tech Stack used
- MongoDB, Redis - database
- Express - backend
- React and Tailwind CSS - frontend 
- NodeJS
- Images uploaded by users to be stored in Firebase Storage
### Packages 
- Socket.io and Simple Peer 
- Firebase 
- SendGrid 
- BullMQ 
- Mongoose 
- Google API 
- Redis Adapter 

## Method of Deployment
- Dockerize and push to Docker Hub for both frontend and backend application
- Deploy with Digital Ocean VM


