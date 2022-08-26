FROM ubuntu:20.04

# set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# no apt prompts
ARG DEBIAN_FRONTEND=noninteractive

# Make sure locale is set to UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

RUN apt-get -y update && apt-get -y install \
    locales \
    locales-all \
    python3 \
    mongo-tools \
    python3-dev \
    python3-pip \
    libmysqlclient-dev \
    uwsgi-plugin-python3

# alias "python" to "python3"
RUN ln -s /usr/bin/python3 /usr/bin/python

# install python3 dependencies
RUN pip3 install --upgrade pip
COPY ./requirements.txt /tmp/requirements.txt
WORKDIR /tmp
RUN pip3 install -r requirements.txt

# change to app dir
WORKDIR /opt/writehat

