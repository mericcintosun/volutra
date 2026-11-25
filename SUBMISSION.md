<!--
Hackathon requirements, quoted verbatim, each mapped to its field:
[x] "Gerçek dünyadaki bir soruna çözüm getiren ya da olumlu sosyal etki yaratan bir proje (web, mobil, yapay zeka aracı, oyun vb.)" : field 3, Problem statement and Social impact (web app)
[x] "Proje başlığı" : field 1, Project name
[x] "Ayrıntılı proje açıklaması: problem tanımı, çözüm özeti, temel özellikler, kullanılan teknolojiler, hedef kullanıcılar" : field 3, the five headings below
[ ] "İşlevselliği veya tasarımı gösteren en az bir dosya (ekran görüntüsü, video vb.; basit prototip veya maket yeterli)" : gallery upload by hand, see docs/SCREENSHOTS.md
[x] "GitHub/GitLab depo bağlantısı (isteğe bağlı ama önerilir)" : field 5, Try it out
[x] "Web veya mobil uygulamaysa canlı demo bağlantısı (mümkünse)" : field 5, Try it out
[ ] "Ekip üyeleri ve rolleri (tek kişilik başvuru kabul ediliyor)" : filled by hand on Devpost, see HANDOFF.md manual checklist
-->

# Devpost fields for Volutra (in form order)

## 1. Project name

Volutra

## 2. Elevator pitch

Draw a 20-second spiral and Volutra measures your Parkinson's tremor in the browser, then charts it against your dose time to show the hour your levodopa wears off.

(164 characters, limit 200.)

## 3. About the project

### Problem statement

Levodopa, the main Parkinson's medication, fades between doses; neurologists call it wearing-off. Dose timing is adjusted from a paper on/off diary filled in from memory, and a ten-minute clinic visit every three to six months rarely sees the tremor that starts in the afternoon at home. Patients and carers can say "it gets worse after lunch", but they cannot show a number or a time.

### Solution overview

Volutra turns the Archimedes spiral, a familiar clinical drawing test, into a reading you can repeat through the day in any browser. The pad records timestamped pointer events, the spiral is unwrapped and fitted to r = a + bθ, and the leftover wobble is resampled to 100 Hz and run through an FFT written in the repo. The tallest peak from 3 to 12 Hz is the tremor frequency and the band energy is the amplitude in millimetres. Each reading lands on a timeline keyed to the dose time: the first two readings after the dose set a baseline, and the first reading at 1.5 times that is marked as the point where the dose wears off. On the seeded demo day that mark lands at 14:40, 6 h 40 min after the 08:00 dose.

### Key features

- Draw a spiral on `/spirals/new` and read the dominant frequency in Hz, the amplitude in mm, the spectrum and the points per second a moment after lifting.
- Your own spiral is rebuilt as a 3D clay coil whose colour follows your amplitude against today's 0.64 mm line.
- Replay a real UCI 395 Parkinson's tablet recording at its own speed: the spectrum peaks near 5 Hz and the coil turns from the top view to a side view that shows the tremor as relief.
- "Compare with my last drawing" puts your own spectrum on the same chart as the recording.
- The dose day page shows the 08:00 dose, the 14:40 wearing-off band and every reading; change the dose time and the marks are recomputed.
- One-page A4 printout with a "Not a diagnostic tool" line, plus a CSV download.
- A secondary "resemblance to the UCI Parkinson's group" score from a logistic regression trained in the repo, with its subject-wise cross-validated balanced accuracy (0.661) printed next to it.
- Nothing leaves the device: all math runs in the tab and readings stay in localStorage.

### Technologies used

Next.js 15 with the App Router, React 19, TypeScript 5 in strict mode and Tailwind CSS 4. three, @react-three/fiber and @react-three/drei draw the coil. zod checks route ids, the converted recordings, the model weights and every localStorage read. The signal processing (polar unwrap, least-squares fit, Hann window, radix-2 FFT) and the logistic regression are plain TypeScript in the repo; Node scripts run with tsx convert UCI 395 and train the model with subject-wise cross-validation. Deployed on Vercel.

### Target users

- People with Parkinson's on levodopa whose neurologist is adjusting dose timing
- Carers who keep the on/off diary for them
- Neurologists and Parkinson's nurses who want a dated, numeric record instead of a recollection

### Social impact

More than ten million people live with Parkinson's, and for many of them dose timing decides whether the afternoon is usable. Volutra needs no install, no account and no special hardware, and it keeps health data on the device. A dated chart with a marked time gives the next clinic conversation something to point at. Volutra is a measurement diary, not a diagnostic tool.

## 4. Built with

next, react, react-dom, typescript, tailwindcss, three, @react-three/fiber, @react-three/drei, zod, lucide-react, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, tsx

## 5. Try it out

- Live: https://volutra.vercel.app
- Repo: https://github.com/mericcintosun/volutra
