FROM ubuntu:20.04

# set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# no apt prompts
ARG DEBIAN_FRONTEND=noninteractive

# fetch package list
RUN apt-get -y update

# Make sure locale is set to UTF-8
RUN apt-get install -y locales locales-all
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

# install mysql client
RUN apt-get -y install libmysqlclient-dev

# install python
RUN apt-get -y install python3 python3-dev python3-pip

# alias "python" to "python3"
RUN ln -s /usr/bin/python3 /usr/bin/python

# install python3 dependencies
RUN pip3 install --upgrade pip
COPY ./requirements.txt /tmp/requirements.txt
WORKDIR /tmp
RUN pip3 install -r requirements.txt
RUN pip3 install uwsgi
RUN pip3 install openpyxl

# install uwsgi plugin
RUN apt-get -y install uwsgi-plugin-python3

# change to app dir
WORKDIR /opt/writehat

# install mongo tools
RUN apt-get -y install mongo-tools
