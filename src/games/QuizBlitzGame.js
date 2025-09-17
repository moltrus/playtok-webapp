import { BaseGame } from './BaseGame.js';

export class QuizBlitzGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            this.questions = [
                {
                    question: "What is the capital of France?",
                    options: ["London", "Berlin", "Paris", "Madrid"],
                    correct: 2
                },
                {
                    question: "Which planet is closest to the Sun?",
                    options: ["Venus", "Mercury", "Earth", "Mars"],
                    correct: 1
                },
                {
                    question: "What is 2 + 2?",
                    options: ["3", "4", "5", "6"],
                    correct: 1
                },
                {
                    question: "Who painted the Mona Lisa?",
                    options: ["Van Gogh", "Da Vinci", "Picasso", "Monet"],
                    correct: 1
                },
                {
                    question: "What is the largest mammal?",
                    options: ["Elephant", "Blue Whale", "Giraffe", "Hippo"],
                    correct: 1
                },
                {
                    question: "Which year did WWII end?",
                    options: ["1944", "1945", "1946", "1947"],
                    correct: 1
                },
                {
                    question: "What is the chemical symbol for gold?",
                    options: ["Go", "Gd", "Au", "Ag"],
                    correct: 2
                },
                {
                    question: "How many continents are there?",
                    options: ["5", "6", "7", "8"],
                    correct: 2
                },
                {
                    question: "What is the fastest land animal?",
                    options: ["Lion", "Cheetah", "Ostrich", "Gazelle"],
                    correct: 1
                },
                {
                    question: "Which language is spoken in Brazil?",
                    options: ["Spanish", "English", "Portuguese", "French"],
                    correct: 2
                },
                {
                    question: "What is the largest organ in the human body?",
                    options: ["Heart", "Liver", "Skin", "Brain"],
                    correct: 2
                },
                {
                    question: "Who wrote 'Romeo and Juliet'?",
                    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                    correct: 1
                },
                {
                    question: "Which color is not in the rainbow?",
                    options: ["Purple", "Brown", "Red", "Orange"],
                    correct: 1
                },
                {
                    question: "What is the tallest mountain in the world?",
                    options: ["K2", "Mount Kilimanjaro", "Mount Everest", "Mount Fuji"],
                    correct: 2
                },
                {
                    question: "What is the square root of 64?",
                    options: ["6", "7", "8", "9"],
                    correct: 2
                }
            ];
            
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.gameTime = 60000; // 60 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.selectedOption = -1;
            this.feedbackTime = 0;
            this.showFeedback = false;
            this.isCorrect = false;
            this.buttonWidth = 0;
            this.buttonHeight = 0;
            this.questionFontSize = 0;
            this.optionFontSize = 0;
            this.gameCompleted = false;
            this.correctAnswers = 0;
            this.incorrectAnswers = 0;
            
            // Set up event listeners
            this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            
        } catch (error) {
            console.error('Error in QuizBlitzGame constructor:', error);
        }
    }
    
    updateLogicalDimensions() {
        try {
            // Call the parent method first
            super.updateLogicalDimensions();
            
            // Adjust button and text sizes based on canvas dimensions
            const canvasWidth = this.canvasWidth;
            const canvasHeight = this.canvasHeight;
            
            this.buttonWidth = Math.min(canvasWidth * 0.8, 400);
            this.buttonHeight = Math.min(canvasHeight * 0.1, 60);
            this.questionFontSize = Math.min(canvasWidth * 0.05, 24);
            this.optionFontSize = Math.min(canvasWidth * 0.04, 20);
            
        } catch (error) {
            console.error('Error in updateLogicalDimensions:', error);
            // Set defaults
            this.buttonWidth = 300;
            this.buttonHeight = 50;
            this.questionFontSize = 20;
            this.optionFontSize = 16;
        }
    }
    
    init() {
        try {
            this.score = 0;
            this.currentQuestionIndex = 0;
            this.timeRemaining = this.gameTime;
            this.lastTime = Date.now();
            this.selectedOption = -1;
            this.showFeedback = false;
            this.feedbackTime = 0;
            this.isCorrect = false;
            this.isRunning = false;
            this.gameCompleted = false;
            this.correctAnswers = 0;
            this.incorrectAnswers = 0;
            
            // Shuffle the questions
            this.shuffleQuestions();
            
            // Update score display
            this.updateScore(0);
            
            // Draw initial state
            this.draw();
        } catch (error) {
            console.error('Error in QuizBlitzGame.init():', error);
        }
    }
    
    shuffleQuestions() {
        try {
            // Fisher-Yates shuffle algorithm
            for (let i = this.questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
            }
        } catch (error) {
            console.error('Error in shuffleQuestions:', error);
        }
    }
    
    start() {
        try {
            // Reset the game
            this.init();
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in QuizBlitzGame.start():', error);
            super.start();
        }
    }

    update(deltaTime) {
        try {
            if (!this.isRunning) return;

            // If showing feedback, count down the feedback timer
            if (this.showFeedback) {
                this.feedbackTime -= deltaTime;
                if (this.feedbackTime <= 0) {
                    this.showFeedback = false;
                    
                    // Always move to the next question when feedback ends
                    this.moveToNextQuestion();
                    
                    this.selectedOption = -1;
                }
            }

            // Update timer
            this.timeRemaining -= deltaTime;
            
            // Game over if time runs out
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.updateScore(this.score);
                this.stop();
                return;
            }
            
            // Draw the game
            this.draw();
        } catch (error) {
            console.error('Error in update:', error);
        }
    }
    
    moveToNextQuestion() {
        try {
            this.currentQuestionIndex++;
            
            // If we've gone through all questions, end the game
            if (this.currentQuestionIndex >= this.questions.length) {
                // Game completed - all questions answered
                this.updateScore(this.score);
                this.stop();
                this.gameCompleted = true;
            }
            
        } catch (error) {
            console.error('Error in moveToNextQuestion:', error);
        }
    }
    
    draw() {
        try {
            // Clear the canvas
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw the background
            this.ctx.fillStyle = '#F8F9FA';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw time remaining
            const timeText = `Time: ${Math.ceil(this.timeRemaining / 1000)}s`;
            this.drawText(timeText, this.canvasWidth - 70, 30, 16, '#333333', 'right');
            
            // Draw current score
            const scoreText = `Score: ${this.score}`;
            this.drawText(scoreText, 70, 30, 16, '#333333', 'left');
            
            if (this.isRunning) {
                // Get the current question
                const currentQuestion = this.questions[this.currentQuestionIndex];
                
                // Draw the question
                this.drawText(
                    currentQuestion.question, 
                    this.canvasWidth / 2, 
                    80, 
                    this.questionFontSize, 
                    '#333333'
                );
                
                // Draw each option
                const startY = 150;
                const spacing = this.buttonHeight + 20;
                
                for (let i = 0; i < currentQuestion.options.length; i++) {
                    const y = startY + i * spacing;
                    
                    // Determine button color based on state
                    let buttonColor = '#E9ECEF';
                    let textColor = '#333333';
                    
                    if (this.showFeedback) {
                        if (i === currentQuestion.correct) {
                            buttonColor = '#4ECDC4'; // Correct answer
                        } else if (i === this.selectedOption && !this.isCorrect) {
                            buttonColor = '#FF6B6B'; // Incorrect selection
                        }
                    } else if (i === this.selectedOption) {
                        buttonColor = '#ADB5BD'; // Selected but no feedback yet
                    }
                    
                    // Draw the option button
                    this.drawButton(
                        this.canvasWidth / 2 - this.buttonWidth / 2,
                        y,
                        this.buttonWidth,
                        this.buttonHeight,
                        buttonColor
                    );
                    
                    // Draw the option text
                    this.drawText(
                        currentQuestion.options[i],
                        this.canvasWidth / 2,
                        y + this.buttonHeight / 2,
                        this.optionFontSize,
                        textColor
                    );
                }
                
                // Draw feedback message if showing feedback
                if (this.showFeedback) {
                    const feedbackText = this.isCorrect ? "Correct!" : "Incorrect!";
                    const feedbackColor = this.isCorrect ? "#4ECDC4" : "#FF6B6B";
                    
                    // Calculate and display points gained or lost
                    const pointsText = this.isCorrect 
                        ? `+${100 + Math.floor(this.timeRemaining / 1000)} points` 
                        : "-50 points";
                    
                    this.drawText(
                        feedbackText,
                        this.canvasWidth / 2,
                        this.canvasHeight - 90,
                        24,
                        feedbackColor
                    );
                    
                    this.drawText(
                        pointsText,
                        this.canvasWidth / 2,
                        this.canvasHeight - 60,
                        20,
                        feedbackColor
                    );
                }
            } else {
                // Game over message
                if (this.timeRemaining <= 0) {
                    this.drawText('TIME\'S UP!', this.canvasWidth / 2, this.canvasHeight / 2 - 50, 30, '#FF6B6B');
                    this.drawText(`Final Score: ${this.score}`, this.canvasWidth / 2, this.canvasHeight / 2, 20, '#333333');
                    this.drawText(`Correct: ${this.correctAnswers} | Incorrect: ${this.incorrectAnswers}`, 
                        this.canvasWidth / 2, this.canvasHeight / 2 + 30, 16, '#333333');
                    this.drawText(`Questions Completed: ${this.correctAnswers + this.incorrectAnswers}/${this.questions.length}`, 
                        this.canvasWidth / 2, this.canvasHeight / 2 + 60, 16, '#333333');
                } else if (this.gameCompleted) {
                    this.drawText('QUIZ COMPLETED!', this.canvasWidth / 2, this.canvasHeight / 2 - 50, 30, '#4ECDC4');
                    this.drawText(`Final Score: ${this.score}`, this.canvasWidth / 2, this.canvasHeight / 2, 20, '#333333');
                    this.drawText(`Correct: ${this.correctAnswers} | Incorrect: ${this.incorrectAnswers}`, 
                        this.canvasWidth / 2, this.canvasHeight / 2 + 30, 16, '#333333');
                    this.drawText(`Accuracy: ${Math.round((this.correctAnswers / this.questions.length) * 100)}%`, 
                        this.canvasWidth / 2, this.canvasHeight / 2 + 60, 16, '#333333');
                }
            }
        } catch (error) {
            console.error('Error in draw:', error);
        }
    }
    
    handleAnswer(optionIndex) {
        try {
            if (this.showFeedback) return; // Don't allow selection while showing feedback
            
            const currentQuestion = this.questions[this.currentQuestionIndex];
            this.selectedOption = optionIndex;
            
            // Check if the answer is correct
            this.isCorrect = optionIndex === currentQuestion.correct;
            
            // Track answer statistics
            if (this.isCorrect) {
                this.correctAnswers++;
            } else {
                this.incorrectAnswers++;
            }
            
            // Update score based on correct/incorrect answer
            if (this.isCorrect) {
                // Calculate time bonus - more time remaining = higher bonus
                const timeBonus = Math.floor(this.timeRemaining / 1000);
                
                // Calculate points for correct answer
                const points = 100 + timeBonus;
                this.score += points;
                this.updateScore(this.score);
            } else {
                // Deduct points for incorrect answer
                const penalty = -50; // 50 point penalty for wrong answers
                this.score = Math.max(0, this.score + penalty); // Never go below 0
                this.updateScore(this.score);
            }
            
            // Show feedback for a short time
            this.showFeedback = true;
            this.feedbackTime = 1500; // 1.5 seconds
        } catch (error) {
            console.error('Error in handleAnswer:', error);
        }
    }
    
    isPointInButton(x, y, buttonIndex) {
        const startY = 150;
        const spacing = this.buttonHeight + 20;
        const buttonY = startY + buttonIndex * spacing;
        const buttonX = this.canvasWidth / 2 - this.buttonWidth / 2;
        
        return x >= buttonX && 
               x <= buttonX + this.buttonWidth && 
               y >= buttonY && 
               y <= buttonY + this.buttonHeight;
    }
    
    handlePointerDown(e) {
        if (!this.isRunning) return;

        const { x, y } = this.getLogicalCoordinates(e.clientX, e.clientY);

        if (this.showFeedback) return;

        for (let i = 0; i < 4; i++) {
            if (this.isPointInButton(x, y, i)) {
                this.handleAnswer(i);
                break;
            }
        }
    }
    
    drawButton(x, y, width, height, color) {
        try {
            this.ctx.fillStyle = color;
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, width, height, 10);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        } catch (error) {
            console.error('Error in drawButton:', error);
            
            // Fallback to simple rectangle if roundRect is not supported
            try {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, width, height);
            } catch (fallbackError) {
                console.error('Error in drawButton fallback:', fallbackError);
            }
        }
    }
    
    drawText(text, x, y, size, color, align = 'center') {
        try {
            this.ctx.font = `${size}px Arial, sans-serif`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = align;
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x, y);
        } catch (error) {
            console.error('Error in drawText:', error);
        }
    }
    
    getInstructions() {
        return "Test your knowledge! Select the correct answer from the four options. Earn points for correct answers, wrong answers will cost you points!";
    }
}