#!/bin/bash

# Beifong Management Script

show_help() {
    echo "Beifong Management Commands:"
    echo ""
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  build     Rebuild images"
    echo "  clean     Stop and remove containers"
    echo "  reset     Remove containers and data (WARNING)"
    echo "  backup    Backup data to ./backup_[timestamp]"
    echo "  help      Show this help"
}

case "$1" in
    start)
        echo "Starting services..."
        docker-compose up -d
        docker-compose ps
        ;;
    stop)
        echo "Stopping services..."
        docker-compose stop
        ;;
    restart)
        echo "Restarting services..."
        docker-compose restart
        ;;
    status)
        docker-compose ps
        ;;
    build)
        echo "Rebuilding images..."
        docker-compose build --no-cache
        ;;
    clean)
        echo "Removing containers..."
        docker-compose down
        ;;
    reset)
        echo "WARNING: This will delete all data!"
        read -p "Continue? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            echo "Reset complete"
        fi
        ;;
    backup)
        BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
        echo "Creating backup: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        docker run --rm -v beifong_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine cp -r /data /backup/databases
        docker run --rm -v beifong_podcasts:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine cp -r /data /backup/podcasts
        echo "Backup complete: $BACKUP_DIR"
        ;;
    help|*)
        show_help
        ;;
esac