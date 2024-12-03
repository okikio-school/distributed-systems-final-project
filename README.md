# GroovyBytes Call

An experimental VoIP calling system built with WebRTC, Astro, Solid.js, Tailwind, Node.js, and Deno. The goal of the project is to create a reliable and secure VoIP solution that encourages being mobile with calls, enabling people to have calls across various devices, applications, network mediums, and more, allowing calls to be transfered between devices without any disruptions.

We were sucessful in getting the call to start but were unable to get the calls to transfer between devices in the time allocated. We also struggled with WebRTC issues within certain environments, for example, within the schools wifi network, the WebRTC connection was blocked or at least unable to connect properly.

## Project Setup

To set up the project locally, follow the steps below:

### Prerequisites:

DevBox is a tool that provides a consistent development environment for the project. It is recommended to use DevBox to set up the project locally. To install DevBox, run the following commands:

```sh
curl -fsSL https://get.jetify.com/devbox | bash
devbox shell
```

Or, you can install the required tools manually.

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version specified in `.nvmrc`)
- [pnpm](https://pnpm.io/installation)
- [deno](https://deno.com/)

### Install dependencies:
  Install the project dependencies using `pnpm`:

  ```sh
  pnpm install -r
  ```

## Steps to Deploy:

  ```sh
  pnpm start
  ```

### Explanation of the Project Structure

- **apps/**: Contains user-facing applications. Currently, it includes the Astro call demo & the backend webrtc server.
  - **frontend/**: The Astro demo call application.
    - **src/**: Source code for the call app.
    - **public/**: Static assets like images for the call app.
  - **backend/**: The Deno based backend applicaiton for handling the websocket connection between the 2 peers during a call.
- **devbox.json**: Configuration file for DevBox.
- **pnpm-workspace.yaml**: Configuration file for pnpm workspace.
- **package.json**: Root package.json file for the project.
- **tsconfig.json**: TypeScript configuration file.
- **tsup.config.ts**: Configuration file for tsup, a TypeScript bundler.

> **Note**: The project structure is subject to change as the project evolves. In addition, I've excluded files and directories that are not relevant to the project setup.

## Goal

We’re trying to create a reliable and secure VoIP solution that encourages being mobile with calls, enabling people to have calls traverse across devices, applications, network mediums and more… Basically we don’t want a user to have to cut a call to switch devices or to be able to move between rooms, we want to have calls with no call flow interruptions or disruptions. 

Currently, you need to cut the call or have multiple of your devices all join the same call at the same time, leading to distractions, echos and disruption to the flow of calls, e.g. people losing their trains of thought, etc….

What makes our approach new and novel is that we noticed that the only VoIP provider that supports the smooth transfer of call between devices is Discord. A thing to note though is that all calls go through their server which stores logs of calls, and the transfer isn’t as smooth as it could/should be. Our approach will have the call be direct peer to peer with the central server serving as management and monitor, all without watching the packets being sent, while still allowing for the smooth transfer of calls between devices with no loss of focus by the call participants or noticeable disruptions. 

Our stakeholders, the people who will care and benefit the most from our project being successful are users who find themselves often engaging in:

1. Remote calls. -  White Collar Business Users

2. Group meetings with many participants. - Students, Teams, Execs., etc..

3. Long distance calls.

4. Long meetings. - Conference calls, Presentations, etc…

If successful we’ll have software that enables human connection and aids in allowing continuous flow of ideas, with little to no drops, technical issues, distractions and disturbances. By doing this we become a central place of telephony communication. When customers need to start a conversation they start with us, enabling the smooth transfer of ideas from people through the medium of voice communication. For our school it means smoother meetings, for remote workplaces less distractions, less technical issues, less wasted time, for conferences smooth workflow less hurdles to large group conferences. 

The risks of this project include unstable connections between peer computers, inability to ensure smooth transfer of calls between devices such that it is not noticeable to customers, there is a risk involved in the recovery of dropped calls, risk involved in ensuring the central server is always up and running, etc… 

To mitigate these risks we’re designing each piece of the architecture to be extremely resilient and robust. We’re taking advantage of UDP to have the voice message be low latency. We’ll have mobile agents monitoring the calls to ensure the calls don’t drop and assisting with keeping the connection smooth between the multiple devices. We’ll have the centralized server be a cluster meaning even if it goes down there are more nodes able to take over and assist, we’ll also take advantage of this cluster model to ensure the central server can scale to match the needs of multiple people all taking calls online.

The payoff is that when this project succeeds, users will find the product pleasant, convenient and reliable to use for communication, boosting the user's confidence, communication flow and business practices. The rewards are worth the risk as communication is key in our modern society and a smoother communication flow means smoother idea flow which is a great driver of innovation.

For a simple call the current estimate is a computer for running the centralized server, as well as the storage system, assuming a relatively new computer with about a terabyte of storage and maybe 16 GB of RAM then \~$3,500.

Some checks of success include testing of the core goal, which is the ability to have a smooth call. For the midterm confirming we can have a call and can have the call switch between different devices, testing that the latency for switching between devices takes less than 2s. The final test is having less than 300 ms for switching between devices with an average latency for a call between peers of less than 300 ms. Once we’ve achieved these metrics we’ll know the project was successful.


## Requirements

- Centralized communication

  - Facilitates calls between peers.

  - Authenticate users.

  - Supports monitoring and measuring calls without directly storing the packets, keeping the call secure, reliable and reducing load on the centralized communication. 

  - Keeping calls open such that users can leave and join at any time (with a timeout so the call ends when only one peers is left for more than 5 mins or when the last person ends the call)

- Low-latency communication

- Connect peers with a direct connection for voice calls

- The centralized server must be multithreaded so it can handle multiple clients requests at once

- Each thread will represent a mobile agent who monitors the call and watches over the lifecycle of calls (as we're using JS for calls we actually won't need a seperate thread for each call, we can just have a single thread for all calls especially when limited to 1 call per user)

- Agents will handle the lifecycle of connections between clients once they start a call. This is to ensure that the server will not be overloaded with tasks being; accepting new clients, and handling connections. The agents will alleviate that load providing some level of load balancing.


## Technical Details & Diagram

The distributed architecture will consist of a couple components:

- One central server, responsible for:

  - Accepting clients into the network

  - Removing clients when they are ready to leave, or inactive

  - Authenticating clients via the use of the storage system

  - Tracking all connected clients (active or inactive)

  - Deploying ready agents in separates threads when clients are ready to communicate with one another

  - Rerouting agents to new instances of clients (transfering calls between clients)

* One storage system responsible for:

  - Holding authentication details (usernames and passwords)

  - Time logs:

    - Time stamps from when a user connected

    - Connection to server duration

    - Timestamps from when they disconnect

- Mobile agents responsible for:

  - Handling and establishing direct communications between clients for VoIP

  - Monitoring client sessions

    - If a client is found inactive for a certain duration it should be disconnected and the connection should be closed

    - The opposite is also true. If a client disconnects within the maximum inactivity limit it should be allowed to reconnect to the session

  - If a device transfer occurs, the agent is responsible for establishing a new connection between the existing client and newly transferred device 

\


![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcrP5NQxo2Dvz3Hce_tRYgNrO44mHVoVCCgxkra90w28bcJkuqmUaTbYB-oPOpwkc9xesp9SyMpu4OvXDR95fiFrNZVMv7woMslYmG2wQ8KgzAjTAzfdJiRrK8leWzx-TcoYyz_yw?key=4nsGpuevJ91jAIMo29v3aW48)

_The diagram above shows the basic flow that the communication system will follow\._ 


## Conclusion

The VoIP project is related to the course through the inclusion of peer to peer communication, reliable centralized server, synchronous transitive communication, etc…

In terms of resources we’ll utilize the course content to apply what we’ve learned in distributed systems, to ensure we can enable the distributed system principles of transparency and reliability. 

We will need a framekworks and tools such as Astro, Deno, and Solid.js to help manage the user interface for the program, database, and a centralized server in order to help us manage connections. 

In addition, we will need a simple user interface, support for WebRTC/WebTransport/UDP and a tracking mechanism to ensure we’re able to meet our success metrics.

Though the project wasn't as successful as we had hoped, we were able to start calls between peers and have a basic call system running, which isn't much but hopefully counts as a consolidation prize.
